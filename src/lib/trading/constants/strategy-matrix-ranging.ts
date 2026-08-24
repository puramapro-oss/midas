// =============================================================================
// MIDAS — Strategy Matrix: Ranging Markets
// =============================================================================

import type { StrategyScore, VolatilityLevel, TrendLevel } from './strategy-matrix-types';

export const STRATEGY_MATRIX_RANGING: Record<
  VolatilityLevel,
  Record<TrendLevel, StrategyScore[]>
> = {
  low: {
    weak: [
      { strategy: 'grid', score: 90, reason: 'Perfect grid conditions: range + low vol' },
      { strategy: 'mean-reversion', score: 85, reason: 'Classic mean reversion setup' },
    ],
    moderate: [
      { strategy: 'grid', score: 85, reason: 'Grid still strong in range' },
      { strategy: 'mean-reversion', score: 80, reason: 'Mean reversion with some trend' },
    ],
    strong: [
      { strategy: 'smart-entry', score: 80, reason: 'Wait for breakout' },
      { strategy: 'swing', score: 75, reason: 'Prepare for direction' },
    ],
  },
  medium: {
    weak: [
      { strategy: 'grid', score: 85, reason: 'Grid profits from oscillation' },
      { strategy: 'mean-reversion', score: 80, reason: 'Fade moves to mean' },
    ],
    moderate: [
      { strategy: 'mean-reversion', score: 80, reason: 'Mean reversion on swings' },
      { strategy: 'grid', score: 75, reason: 'Grid with wider bands' },
    ],
    strong: [
      { strategy: 'smart-entry', score: 80, reason: 'Breakout imminent, smart entries' },
      { strategy: 'momentum', score: 70, reason: 'Position for breakout' },
    ],
  },
  high: {
    weak: [
      { strategy: 'scalping', score: 80, reason: 'Scalp volatile range' },
      { strategy: 'grid', score: 70, reason: 'Wide grid in vol range' },
    ],
    moderate: [
      { strategy: 'scalping', score: 80, reason: 'Quick profits in volatile range' },
      { strategy: 'mean-reversion', score: 70, reason: 'Fade extreme moves' },
    ],
    strong: [
      { strategy: 'smart-entry', score: 80, reason: 'Breakout setup detected' },
      { strategy: 'scalping', score: 70, reason: 'Scalp while waiting' },
    ],
  },
};
