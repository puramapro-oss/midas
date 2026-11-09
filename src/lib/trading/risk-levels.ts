// =============================================================================
// MIDAS SHIELD — Risk Levels (7 checks)
// =============================================================================

import type { CoordinatorDecision } from '@/lib/agents/types';
import type { ShieldConfig } from '@/types/trading';
import type { UserProfile, OpenPosition, TradeHistory } from './risk-manager';

export interface LevelResult {
  passed: boolean;
  message: string;
}

export function level1PositionSizing(
  decision: CoordinatorDecision,
  profile: UserProfile,
  config: ShieldConfig
): LevelResult {
  if (decision.action === 'hold') {
    return { passed: true, message: '' };
  }

  const riskPct = decision.position_size_pct;
  const riskPercentages = [config.max_position_size_pct, profile.max_position_size_pct, riskPct];
  if (!riskPercentages.every((value) => Number.isFinite(value) && value > 0 && value <= 100)) {
    return { passed: false, message: '[L1 Position Sizing] Invalid position size or risk limit' };
  }
  const maxRiskPct = Math.min(config.max_position_size_pct, profile.max_position_size_pct);

  if (riskPct > maxRiskPct) {
    return {
      passed: false,
      message: `[L1 Position Sizing] Risk ${riskPct.toFixed(2)}% exceeds max ${maxRiskPct}% per trade`,
    };
  }

  const maxRiskUsd = profile.capital_usd * (maxRiskPct / 100);
  const entryPrice = decision.entry_price;
  const stopLoss = decision.stop_loss;

  if (entryPrice > 0 && stopLoss !== null && stopLoss > 0) {
    const priceDiff = Math.abs(entryPrice - stopLoss);
    const positionValue = profile.capital_usd * (riskPct / 100);
    const impliedLoss = (priceDiff / entryPrice) * positionValue;

    if (impliedLoss > maxRiskUsd) {
      return {
        passed: false,
        message: `[L1 Position Sizing] Implied loss $${impliedLoss.toFixed(2)} exceeds max risk $${maxRiskUsd.toFixed(2)}`,
      };
    }
  }

  return { passed: true, message: '' };
}

export function level2ValidateStopLoss(decision: CoordinatorDecision): LevelResult {
  if (decision.action === 'hold') {
    return { passed: true, message: '' };
  }

  if (decision.stop_loss === null || decision.stop_loss <= 0) {
    return {
      passed: false,
      message: '[L2 Stop Loss] No stop loss defined — trade rejected',
    };
  }

  if (decision.entry_price <= 0) {
    return {
      passed: false,
      message: '[L2 Stop Loss] Invalid entry price',
    };
  }

  const distancePct =
    (Math.abs(decision.entry_price - decision.stop_loss) / decision.entry_price) * 100;

  if (distancePct < 0.1) {
    return {
      passed: false,
      message: `[L2 Stop Loss] Distance ${distancePct.toFixed(3)}% is too tight — will trigger on noise`,
    };
  }

  if (distancePct > 15) {
    return {
      passed: false,
      message: `[L2 Stop Loss] Distance ${distancePct.toFixed(2)}% is too wide — max 15% allowed`,
    };
  }

  if (decision.action === 'buy' && decision.stop_loss >= decision.entry_price) {
    return {
      passed: false,
      message: '[L2 Stop Loss] Buy stop loss must be below entry price',
    };
  }

  if (decision.action === 'sell' && decision.stop_loss <= decision.entry_price) {
    return {
      passed: false,
      message: '[L2 Stop Loss] Sell stop loss must be above entry price',
    };
  }

  return { passed: true, message: '' };
}

export function level3TrailingStopReady(
  decision: CoordinatorDecision,
  config: ShieldConfig
): LevelResult {
  if (decision.action === 'hold') {
    return { passed: true, message: '' };
  }

  const rrr = decision.risk_reward_ratio;
  const rewardInputs = [rrr, config.min_risk_reward, decision.entry_price, decision.stop_loss, decision.take_profit];
  if (!rewardInputs.every((value) => Number.isFinite(value) && value > 0)) {
    return { passed: false, message: '[L3 Trailing Stop] Invalid price or risk/reward input' };
  }

  if (rrr < config.min_risk_reward) {
    return {
      passed: false,
      message: `[L3 Trailing Stop] Risk/Reward ratio ${rrr.toFixed(2)} below minimum ${config.min_risk_reward}`,
    };
  }

  const potentialGain = decision.action === 'sell'
    ? decision.entry_price - decision.take_profit
    : decision.take_profit - decision.entry_price;
  const potentialLoss = Math.abs(decision.entry_price - decision.stop_loss);
  const computedRRR = potentialGain / potentialLoss;
  if (!Number.isFinite(computedRRR) || computedRRR < config.min_risk_reward) {
    return {
      passed: false,
      message: `[L3 Trailing Stop] Computed RRR ${computedRRR.toFixed(2)} is invalid or below minimum ${config.min_risk_reward}`,
    };
  }

  return { passed: true, message: '' };
}

export function level4CheckCircuitBreaker(
  recentTrades: TradeHistory[],
  config: ShieldConfig
): LevelResult {
  const maxConsecutive = config.max_consecutive_losses_before_pause;

  if (recentTrades.length < maxConsecutive) {
    return { passed: true, message: '' };
  }

  const sorted = [...recentTrades].sort((a, b) => b.closed_at - a.closed_at);
  const lastN = sorted.slice(0, maxConsecutive);

  const allLosses = lastN.every((t) => t.pnl < 0);
  if (allLosses) {
    const cooldownMs = config.cooldown_after_loss_minutes * 60 * 1000;
    const lastLossTime = lastN[0]?.closed_at ?? 0;
    const now = Date.now();

    if (now - lastLossTime < cooldownMs) {
      return {
        passed: false,
        message: `[L4 Circuit Breaker] ${maxConsecutive} consecutive losses — trading paused for ${config.cooldown_after_loss_minutes}min cooldown`,
      };
    }
  }

  return { passed: true, message: '' };
}

export function level5CheckCrashProtection(
  btcPriceHistory: { timestamp: number; price: number }[],
  config: ShieldConfig
): LevelResult {
  if (!config.emergency_stop_enabled) {
    return { passed: true, message: '' };
  }

  if (btcPriceHistory.length < 2) {
    return { passed: true, message: '' };
  }

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  const sorted = [...btcPriceHistory].sort((a, b) => a.timestamp - b.timestamp);
  const hourAgoEntry = sorted.find((p) => p.timestamp >= oneHourAgo);
  const latest = sorted[sorted.length - 1];

  if (!hourAgoEntry || !latest) {
    return { passed: true, message: '' };
  }

  const changePct = ((latest.price - hourAgoEntry.price) / hourAgoEntry.price) * 100;

  if (changePct <= -5) {
    return {
      passed: false,
      message: `[L5 Crash Protection] BTC dropped ${changePct.toFixed(2)}% in last hour — emergency stop activated`,
    };
  }

  return { passed: true, message: '' };
}

export function level6CheckDiversification(
  decision: CoordinatorDecision,
  openPositions: OpenPosition[],
  profile: UserProfile,
  config: ShieldConfig
): LevelResult {
  if (decision.action === 'hold') {
    return { passed: true, message: '' };
  }

  const maxPositions = Math.min(
    config.max_concurrent_positions,
    profile.max_concurrent_positions
  );

  if (openPositions.length >= maxPositions) {
    return {
      passed: false,
      message: `[L6 Diversification] Already ${openPositions.length}/${maxPositions} positions open — max reached`,
    };
  }

  const symbol = decision.pair;
  const existingExposure = openPositions
    .filter((p) => p.symbol === symbol)
    .reduce((sum, p) => sum + p.allocation_pct, 0);

  const newTotalExposure = existingExposure + decision.position_size_pct;

  if (newTotalExposure > 20) {
    return {
      passed: false,
      message: `[L6 Diversification] ${symbol} exposure would be ${newTotalExposure.toFixed(1)}% — max 20% per token`,
    };
  }

  if (config.blacklisted_symbols.includes(symbol)) {
    return {
      passed: false,
      message: `[L6 Diversification] ${symbol} is blacklisted`,
    };
  }

  return { passed: true, message: '' };
}

export function level7CheckUserLimits(
  decision: CoordinatorDecision,
  profile: UserProfile,
  recentTrades: TradeHistory[],
  config: ShieldConfig
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

  // This only checks the supplied capital and history. It does not obtain
  // account equity or reserve a loss budget shared with other processes.
  const dailyLimitUsd = Math.min(
    profile.daily_loss_limit_usd,
    config.max_daily_loss_usd,
    profile.capital_usd * (config.max_daily_loss_pct / 100),
  );
  if (!Number.isFinite(dailyLimitUsd) || dailyLimitUsd <= 0) {
    return { passed: false, message: '[L7 User Limits] Invalid effective daily loss limit' };
  }

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

  // Roundoff in sums such as 0.06 + 0.01 must not reopen a reached limit.
  const hasReachedLimit = (loss: number, limit: number): boolean =>
    loss >= limit || limit - loss <= Number.EPSILON * Math.max(loss, limit) * (recentTrades.length + 1);

  if (hasReachedLimit(Math.abs(dailyLoss), dailyLimitUsd)) {
    return {
      passed: false,
      message: `[L7 User Limits] Daily loss $${Math.abs(dailyLoss).toFixed(2)} reached limit $${dailyLimitUsd}`,
    };
  }

  if (hasReachedLimit(Math.abs(weeklyLoss), profile.weekly_loss_limit_usd)) {
    return {
      passed: false,
      message: `[L7 User Limits] Weekly loss $${Math.abs(weeklyLoss).toFixed(2)} reached limit $${profile.weekly_loss_limit_usd}`,
    };
  }

  if (hasReachedLimit(Math.abs(monthlyLoss), profile.monthly_loss_limit_usd)) {
    return {
      passed: false,
      message: `[L7 User Limits] Monthly loss $${Math.abs(monthlyLoss).toFixed(2)} reached limit $${profile.monthly_loss_limit_usd}`,
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
