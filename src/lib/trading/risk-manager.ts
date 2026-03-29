// =============================================================================
// MIDAS SHIELD — Risk Manager
// 7 niveaux de protection avant chaque trade
// =============================================================================

import type { CoordinatorDecision } from '@/lib/agents/types';
import type { ShieldConfig } from '@/types/trading';

export interface UserProfile {
  id: string;
  plan: 'free' | 'starter' | 'pro' | 'ultra';
  daily_loss_limit_usd: number;
  weekly_loss_limit_usd: number;
  monthly_loss_limit_usd: number;
  max_position_size_pct: number;
  max_concurrent_positions: number;
  capital_usd: number;
}

export interface OpenPosition {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entry_price: number;
  current_price: number;
  quantity: number;
  unrealized_pnl: number;
  leverage: number;
  allocation_pct: number;
  opened_at: number;
}

export interface TradeHistory {
  pnl: number;
  closed_at: number;
}

export interface ShieldCheckResult {
  passed: boolean;
  failures: string[];
}

interface LevelResult {
  passed: boolean;
  message: string;
}

const DEFAULT_SHIELD_CONFIG: ShieldConfig = {
  max_daily_loss_pct: 5,
  max_daily_loss_usd: 500,
  max_position_size_pct: 2,
  max_leverage: 10,
  max_concurrent_positions: 5,
  max_correlation: 0.8,
  min_risk_reward: 1.5,
  min_confidence: 0.5,
  cooldown_after_loss_minutes: 30,
  max_consecutive_losses_before_pause: 3,
  blacklisted_symbols: [],
  allowed_hours_utc: null,
  manipulation_detection_enabled: true,
  slippage_tolerance_pct: 0.5,
  emergency_stop_enabled: true,
};

export class RiskManager {
  private shieldConfig: ShieldConfig;
  private recentTrades: TradeHistory[];
  private btcPriceHistory: { timestamp: number; price: number }[];

  constructor(
    config?: Partial<ShieldConfig>,
    recentTrades: TradeHistory[] = [],
    btcPriceHistory: { timestamp: number; price: number }[] = []
  ) {
    this.shieldConfig = { ...DEFAULT_SHIELD_CONFIG, ...config };
    this.recentTrades = recentTrades;
    this.btcPriceHistory = btcPriceHistory;
  }

  checkAllLevels(
    decision: CoordinatorDecision,
    profile: UserProfile,
    openPositions: OpenPosition[]
  ): ShieldCheckResult {
    const failures: string[] = [];

    const checks: LevelResult[] = [
      this.level1PositionSizing(decision, profile),
      this.level2ValidateStopLoss(decision),
      this.level3TrailingStopReady(decision),
      this.level4CheckCircuitBreaker(),
      this.level5CheckCrashProtection(),
      this.level6CheckDiversification(decision, openPositions, profile),
      this.level7CheckUserLimits(decision, profile),
    ];

    for (const check of checks) {
      if (!check.passed) {
        failures.push(check.message);
      }
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  // Level 1: Max 2% risk per trade
  private level1PositionSizing(
    decision: CoordinatorDecision,
    profile: UserProfile
  ): LevelResult {
    if (decision.action === 'hold') {
      return { passed: true, message: '' };
    }

    const maxRiskPct = this.shieldConfig.max_position_size_pct;
    const riskPct = decision.position_size_pct;

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

  // Level 2: Stop loss must exist and be ATR-reasonable
  private level2ValidateStopLoss(decision: CoordinatorDecision): LevelResult {
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

    // Stop loss too tight (< 0.1%) — likely noise
    if (distancePct < 0.1) {
      return {
        passed: false,
        message: `[L2 Stop Loss] Distance ${distancePct.toFixed(3)}% is too tight — will trigger on noise`,
      };
    }

    // Stop loss too wide (> 15%) — unreasonable risk
    if (distancePct > 15) {
      return {
        passed: false,
        message: `[L2 Stop Loss] Distance ${distancePct.toFixed(2)}% is too wide — max 15% allowed`,
      };
    }

    // Validate direction
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

  // Level 3: Trailing stop config validation
  private level3TrailingStopReady(decision: CoordinatorDecision): LevelResult {
    // Trailing stop is optional but if risk_reward_ratio is present, validate coherence
    if (decision.action === 'hold') {
      return { passed: true, message: '' };
    }

    const rrr = decision.risk_reward_ratio;

    if (rrr < this.shieldConfig.min_risk_reward) {
      return {
        passed: false,
        message: `[L3 Trailing Stop] Risk/Reward ratio ${rrr.toFixed(2)} below minimum ${this.shieldConfig.min_risk_reward}`,
      };
    }

    if (decision.take_profit !== null && decision.stop_loss !== null && decision.entry_price > 0) {
      const potentialGain = Math.abs(decision.take_profit - decision.entry_price);
      const potentialLoss = Math.abs(decision.entry_price - decision.stop_loss);

      if (potentialLoss > 0) {
        const computedRRR = potentialGain / potentialLoss;
        if (computedRRR < this.shieldConfig.min_risk_reward) {
          return {
            passed: false,
            message: `[L3 Trailing Stop] Computed RRR ${computedRRR.toFixed(2)} is below minimum ${this.shieldConfig.min_risk_reward}`,
          };
        }
      }
    }

    return { passed: true, message: '' };
  }

  // Level 4: 3 consecutive losses = circuit breaker
  private level4CheckCircuitBreaker(): LevelResult {
    const maxConsecutive = this.shieldConfig.max_consecutive_losses_before_pause;

    if (this.recentTrades.length < maxConsecutive) {
      return { passed: true, message: '' };
    }

    const sorted = [...this.recentTrades].sort((a, b) => b.closed_at - a.closed_at);
    const lastN = sorted.slice(0, maxConsecutive);

    const allLosses = lastN.every((t) => t.pnl < 0);
    if (allLosses) {
      const cooldownMs = this.shieldConfig.cooldown_after_loss_minutes * 60 * 1000;
      const lastLossTime = lastN[0]?.closed_at ?? 0;
      const now = Date.now();

      if (now - lastLossTime < cooldownMs) {
        return {
          passed: false,
          message: `[L4 Circuit Breaker] ${maxConsecutive} consecutive losses — trading paused for ${this.shieldConfig.cooldown_after_loss_minutes}min cooldown`,
        };
      }
    }

    return { passed: true, message: '' };
  }

  // Level 5: BTC -5% in 1 hour = close all
  private level5CheckCrashProtection(): LevelResult {
    if (!this.shieldConfig.emergency_stop_enabled) {
      return { passed: true, message: '' };
    }

    if (this.btcPriceHistory.length < 2) {
      return { passed: true, message: '' };
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const sorted = [...this.btcPriceHistory].sort((a, b) => a.timestamp - b.timestamp);
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

  // Level 6: Max 20% per token, max concurrent positions
  private level6CheckDiversification(
    decision: CoordinatorDecision,
    openPositions: OpenPosition[],
    profile: UserProfile
  ): LevelResult {
    if (decision.action === 'hold') {
      return { passed: true, message: '' };
    }

    const maxPositions = Math.min(
      this.shieldConfig.max_concurrent_positions,
      profile.max_concurrent_positions
    );

    if (openPositions.length >= maxPositions) {
      return {
        passed: false,
        message: `[L6 Diversification] Already ${openPositions.length}/${maxPositions} positions open — max reached`,
      };
    }

    // Check per-token concentration (max 20%)
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

    // Check blacklisted symbols
    if (this.shieldConfig.blacklisted_symbols.includes(symbol)) {
      return {
        passed: false,
        message: `[L6 Diversification] ${symbol} is blacklisted`,
      };
    }

    return { passed: true, message: '' };
  }

  // Level 7: Daily/weekly/monthly loss limits
  private level7CheckUserLimits(
    decision: CoordinatorDecision,
    profile: UserProfile
  ): LevelResult {
    if (decision.action === 'hold') {
      return { passed: true, message: '' };
    }

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const dailyLoss = this.sumLosses(dayAgo);
    const weeklyLoss = this.sumLosses(weekAgo);
    const monthlyLoss = this.sumLosses(monthAgo);

    if (profile.daily_loss_limit_usd > 0 && Math.abs(dailyLoss) >= profile.daily_loss_limit_usd) {
      return {
        passed: false,
        message: `[L7 User Limits] Daily loss $${Math.abs(dailyLoss).toFixed(2)} reached limit $${profile.daily_loss_limit_usd}`,
      };
    }

    if (profile.weekly_loss_limit_usd > 0 && Math.abs(weeklyLoss) >= profile.weekly_loss_limit_usd) {
      return {
        passed: false,
        message: `[L7 User Limits] Weekly loss $${Math.abs(weeklyLoss).toFixed(2)} reached limit $${profile.weekly_loss_limit_usd}`,
      };
    }

    if (profile.monthly_loss_limit_usd > 0 && Math.abs(monthlyLoss) >= profile.monthly_loss_limit_usd) {
      return {
        passed: false,
        message: `[L7 User Limits] Monthly loss $${Math.abs(monthlyLoss).toFixed(2)} reached limit $${profile.monthly_loss_limit_usd}`,
      };
    }

    // Check confidence threshold
    if (decision.confidence < this.shieldConfig.min_confidence) {
      return {
        passed: false,
        message: `[L7 User Limits] Confidence ${(decision.confidence * 100).toFixed(1)}% below minimum ${(this.shieldConfig.min_confidence * 100).toFixed(1)}%`,
      };
    }

    return { passed: true, message: '' };
  }

  private sumLosses(sinceTimestamp: number): number {
    return this.recentTrades
      .filter((t) => t.closed_at >= sinceTimestamp && t.pnl < 0)
      .reduce((sum, t) => sum + t.pnl, 0);
  }
}
