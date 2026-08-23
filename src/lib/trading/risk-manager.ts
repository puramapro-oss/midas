// =============================================================================
// MIDAS SHIELD — Risk Manager
// 7 niveaux de protection avant chaque trade
// =============================================================================

import type { CoordinatorDecision } from '@/lib/agents/types';
import type { ShieldConfig } from '@/types/trading';
import {
  level1PositionSizing,
  level2ValidateStopLoss,
  level3TrailingStopReady,
  level4CheckCircuitBreaker,
  level5CheckCrashProtection,
  level6CheckDiversification,
  level7CheckUserLimits,
} from './risk-levels';

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

    const checks = [
      level1PositionSizing(decision, profile, this.shieldConfig),
      level2ValidateStopLoss(decision),
      level3TrailingStopReady(decision, this.shieldConfig),
      level4CheckCircuitBreaker(this.recentTrades, this.shieldConfig),
      level5CheckCrashProtection(this.btcPriceHistory, this.shieldConfig),
      level6CheckDiversification(decision, openPositions, profile, this.shieldConfig),
      level7CheckUserLimits(decision, profile, this.recentTrades, this.shieldConfig),
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
}
