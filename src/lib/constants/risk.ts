// =============================================================================
// MIDAS — Risk Agent Constants (MIDAS SHIELD)
// =============================================================================

import type { MarketRegime } from '@/lib/agents/types';

export const MAX_DAILY_TRADES = 10;
export const MAX_OPEN_POSITIONS = 5;
export const MAX_DRAWDOWN_PCT = 15; // brief : total
export const MAX_DAILY_DRAWDOWN_PCT = 3; // brief : journalier
export const MAX_WEEKLY_DRAWDOWN_PCT = 7; // brief : hebdo
export const MAX_POSITION_SIZE_PCT = 5;
export const MIN_RISK_REWARD_RATIO = 2.0; // brief : R/R minimum 1:2
export const MAX_SPREAD_PCT = 0.5;
export const MIN_CONFIDENCE = 0.4;
export const MIN_COMPOSITE_SCORE = 0.2;
export const MAX_CORRELATION = 0.9; // brief : seuil 90%

export const REGIME_POSITION_LIMITS: Record<MarketRegime, number> = {
  strong_bull: 5,
  weak_bull: 3,
  ranging: 2,
  weak_bear: 2,
  strong_bear: 1.5,
  crash: 0,
  high_volatility: 1.5,
  low_volatility: 4,
};

export const REGIME_LEVERAGE_LIMITS: Record<MarketRegime, number> = {
  strong_bull: 5,
  weak_bull: 3,
  ranging: 2,
  weak_bear: 2,
  strong_bear: 1,
  crash: 1,
  high_volatility: 1,
  low_volatility: 5,
};
