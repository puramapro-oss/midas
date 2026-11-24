// Loss windows and prospective exposure, shared by the seven-level shield.
import type { CoordinatorDecision } from '@/lib/agents/types';
import type { ShieldConfig } from '@/types/trading';
import type { UserProfile, TradeHistory } from './risk-manager';
import type { PaperRiskExposure } from './paper-risk';
import type { LevelResult } from './risk-levels';

export function level7CheckUserLimits(
  decision: CoordinatorDecision,
  profile: UserProfile,
  recentTrades: TradeHistory[],
  config: ShieldConfig,
  paperExposure?: PaperRiskExposure,
): LevelResult {
  if (decision.action === 'hold') {
    return { passed: true, message: '' };
  }

  // Zero or unavailable limits never mean unlimited permission to trade.
  const lossLimitInputs = [
    profile.daily_loss_limit_usd,
    profile.weekly_loss_limit_usd,
    profile.monthly_loss_limit_usd,
    profile.capital_usd,
    config.max_daily_loss_usd,
    config.max_daily_loss_pct,
  ];
  if (!lossLimitInputs.every((value) => Number.isFinite(value) && value > 0)
    || config.max_daily_loss_pct > 100) {
    return { passed: false, message: '[L7 User Limits] Invalid or zero loss limit or capital' };
  }

  // Preflight uses supplied snapshots. The paper SQL transaction rechecks the
  // shared budget under the account lock; neither check guarantees a stop fill.
  const dailyLimitUsd = Math.min(
    profile.daily_loss_limit_usd,
    config.max_daily_loss_usd,
    profile.capital_usd * (config.max_daily_loss_pct / 100),
  );
  if (!Number.isFinite(dailyLimitUsd) || dailyLimitUsd <= 0) {
    return { passed: false, message: '[L7 User Limits] Invalid effective daily loss limit' };
  }

  const { action, entry_price: entry, stop_loss: stop, position_size_pct: size } = decision;
  if ((action !== 'buy' && action !== 'sell')
    || ![entry, stop, size].every((value) => Number.isFinite(value) && value > 0)
    || size > 100 || (action === 'buy' ? stop >= entry : stop <= entry)) {
    return { passed: false, message: '[L7 User Limits] Invalid nominal position or stop' };
  }
  // The pure decision check retains its unleveraged nominal lower bound. The
  // actual paper path supplies the requested quote's costs and all open risk.
  const nominalStopLoss = (Math.abs(entry - stop) / entry) * (profile.capital_usd * (size / 100));
  if (!Number.isFinite(nominalStopLoss) || nominalStopLoss <= 0) {
    return { passed: false, message: '[L7 User Limits] Invalid nominal stop loss' };
  }
  if (paperExposure && (![paperExposure.newPositionLoss, paperExposure.openPositionsLoss]
    .every(value => Number.isFinite(value) && value >= 0) || paperExposure.newPositionLoss <= 0)) {
    return { passed: false, message: '[L7 User Limits] Invalid projected paper exposure' };
  }
  const projectedLoss = paperExposure
    ? Math.max(nominalStopLoss, paperExposure.newPositionLoss) + paperExposure.openPositionsLoss
    : nominalStopLoss;
  const riskDescription = paperExposure
    ? `projected paper loss $${projectedLoss} (including open positions and execution costs)`
    : `nominal stop loss $${nominalStopLoss}`;

  const now = Date.now();
  if (!Array.isArray(recentTrades) || !recentTrades.every((trade) =>
    trade !== null && typeof trade === 'object'
    && Number.isFinite(trade.pnl)
    && Number.isFinite(trade.closed_at) && trade.closed_at >= 0 && trade.closed_at <= now
  )) {
    return { passed: false, message: '[L7 User Limits] Unavailable or invalid loss history' };
  }

  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const sumLosses = (sinceTimestamp: number): number =>
    recentTrades
      .filter((t) => t.closed_at >= sinceTimestamp && t.pnl < 0)
      .reduce((sum, t) => sum + t.pnl, 0);

  const dailyLoss = sumLosses(dayAgo);
  const weeklyLoss = sumLosses(weekAgo);
  const monthlyLoss = sumLosses(monthAgo);

  // Allow for rounding in the historical sum and nominal size/stop arithmetic.
  // A sum such as 0.06 + 0.01 must not reopen a reached limit.
  const hasReachedLimit = (loss: number, limit: number): boolean =>
    loss >= limit || limit - loss <= Number.EPSILON * Math.max(loss, limit) * (recentTrades.length + 5);

  if (hasReachedLimit(Math.abs(dailyLoss) + projectedLoss, dailyLimitUsd)) {
    return {
      passed: false,
      message: `[L7 User Limits] Daily loss $${Math.abs(dailyLoss)} plus ${riskDescription} would reach limit $${dailyLimitUsd}`,
    };
  }

  if (hasReachedLimit(Math.abs(weeklyLoss) + projectedLoss, profile.weekly_loss_limit_usd)) {
    return {
      passed: false,
      message: `[L7 User Limits] Weekly loss $${Math.abs(weeklyLoss)} plus ${riskDescription} would reach limit $${profile.weekly_loss_limit_usd}`,
    };
  }

  if (hasReachedLimit(Math.abs(monthlyLoss) + projectedLoss, profile.monthly_loss_limit_usd)) {
    return {
      passed: false,
      message: `[L7 User Limits] Monthly loss $${Math.abs(monthlyLoss)} plus ${riskDescription} would reach limit $${profile.monthly_loss_limit_usd}`,
    };
  }

  if (decision.confidence < config.min_confidence) {
    return {
      passed: false,
      message: `[L7 User Limits] Confidence ${(decision.confidence * 100).toFixed(1)}% below minimum ${(config.min_confidence * 100).toFixed(1)}%`,
    };
  }

  return { passed: true, message: '' };
}
