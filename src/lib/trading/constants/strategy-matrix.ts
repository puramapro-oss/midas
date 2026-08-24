// =============================================================================
// MIDAS — Strategy Selection Matrix (Re-export Index)
// Maps [regime][volatility][trend] to recommended strategies with scores
// =============================================================================

import type { MarketRegime } from '@/lib/agents/types';
import { STRATEGY_MATRIX_BULL } from './strategy-matrix-bull';
import { STRATEGY_MATRIX_BEAR } from './strategy-matrix-bear';
import { STRATEGY_MATRIX_RANGING } from './strategy-matrix-ranging';
import {
  STRATEGY_MATRIX_CRASH,
  STRATEGY_MATRIX_HIGH_VOLATILITY,
  STRATEGY_MATRIX_LOW_VOLATILITY,
} from './strategy-matrix-volatility';

export type {
  StrategyName,
  StrategyScore,
  VolatilityLevel,
  TrendLevel,
} from './strategy-matrix-types';

// Strategy suitability matrix: [regime][volatility][trend] -> strategies with scores
export const STRATEGY_MATRIX: Record<
  MarketRegime,
  Record<import('./strategy-matrix-types').VolatilityLevel, Record<import('./strategy-matrix-types').TrendLevel, import('./strategy-matrix-types').StrategyScore[]>>
> = {
  ...STRATEGY_MATRIX_BULL,
  ...STRATEGY_MATRIX_BEAR,
  ranging: STRATEGY_MATRIX_RANGING,
  crash: STRATEGY_MATRIX_CRASH,
  high_volatility: STRATEGY_MATRIX_HIGH_VOLATILITY,
  low_volatility: STRATEGY_MATRIX_LOW_VOLATILITY,
};
