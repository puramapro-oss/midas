// =============================================================================
// MIDAS — Strategy Matrix: Volatility Extremes & Crash
// =============================================================================

import type { StrategyScore, VolatilityLevel, TrendLevel } from './strategy-matrix-types';

export const STRATEGY_MATRIX_CRASH: Record<
  VolatilityLevel,
  Record<TrendLevel, StrategyScore[]>
> = {
  low: {
    weak: [
      { strategy: 'smart-entry', score: 70, reason: 'Post-crash: wait for bottom' },
      { strategy: 'dca', score: 60, reason: 'Very cautious DCA' },
    ],
    moderate: [
      { strategy: 'smart-entry', score: 75, reason: 'Look for reversal' },
      { strategy: 'dca', score: 65, reason: 'DCA at deep support' },
    ],
    strong: [
      { strategy: 'smart-entry', score: 80, reason: 'Trend reversal entry' },
      { strategy: 'momentum', score: 70, reason: 'Recovery momentum' },
    ],
  },
  medium: {
    weak: [
      { strategy: 'smart-entry', score: 65, reason: 'Extreme caution' },
      { strategy: 'scalping', score: 60, reason: 'Tiny scalps only' },
    ],
    moderate: [
      { strategy: 'scalping', score: 65, reason: 'Quick in-and-out' },
      { strategy: 'smart-entry', score: 70, reason: 'Wait for confirmation' },
    ],
    strong: [
      { strategy: 'momentum', score: 75, reason: 'Short the crash' },
      { strategy: 'smart-entry', score: 70, reason: 'Wait for reversal' },
    ],
  },
  high: {
    weak: [
      { strategy: 'smart-entry', score: 60, reason: 'Max caution: cash is king' },
      { strategy: 'scalping', score: 55, reason: 'Only if experienced' },
    ],
    moderate: [
      { strategy: 'scalping', score: 60, reason: 'Quick scalps in panic' },
      { strategy: 'smart-entry', score: 65, reason: 'Wait for bottom signals' },
    ],
    strong: [
      { strategy: 'momentum', score: 70, reason: 'Crash momentum with caution' },
      { strategy: 'smart-entry', score: 65, reason: 'Look for capitulation' },
    ],
  },
};

export const STRATEGY_MATRIX_HIGH_VOLATILITY: Record<
  VolatilityLevel,
  Record<TrendLevel, StrategyScore[]>
> = {
  low: {
    weak: [
      { strategy: 'grid', score: 75, reason: 'Grid captures vol swings' },
      { strategy: 'scalping', score: 70, reason: 'Scalp the swings' },
    ],
    moderate: [
      { strategy: 'scalping', score: 80, reason: 'Scalping shines in high vol' },
      { strategy: 'grid', score: 70, reason: 'Grid with tight bands' },
    ],
    strong: [
      { strategy: 'momentum', score: 80, reason: 'Vol + trend = momentum' },
      { strategy: 'scalping', score: 75, reason: 'Quick momentum scalps' },
    ],
  },
  medium: {
    weak: [
      { strategy: 'scalping', score: 80, reason: 'Scalping ideal' },
      { strategy: 'mean-reversion', score: 70, reason: 'Fade extreme moves' },
    ],
    moderate: [
      { strategy: 'scalping', score: 80, reason: 'Scalp with vol edge' },
      { strategy: 'momentum', score: 75, reason: 'Momentum bursts' },
    ],
    strong: [
      { strategy: 'momentum', score: 85, reason: 'Strong trend + vol' },
      { strategy: 'scalping', score: 75, reason: 'Scalp between runs' },
    ],
  },
  high: {
    weak: [
      { strategy: 'scalping', score: 75, reason: 'Only scalp in extreme vol' },
      { strategy: 'smart-entry', score: 65, reason: 'Wait for vol to settle' },
    ],
    moderate: [
      { strategy: 'scalping', score: 75, reason: 'Fast scalps' },
      { strategy: 'momentum', score: 70, reason: 'Ride vol momentum' },
    ],
    strong: [
      { strategy: 'momentum', score: 80, reason: 'Momentum in high vol trend' },
      { strategy: 'scalping', score: 75, reason: 'Scalp the trend' },
    ],
  },
};

export const STRATEGY_MATRIX_LOW_VOLATILITY: Record<
  VolatilityLevel,
  Record<TrendLevel, StrategyScore[]>
> = {
  low: {
    weak: [
      { strategy: 'grid', score: 90, reason: 'Perfect grid: low vol + range' },
      { strategy: 'mean-reversion', score: 85, reason: 'Mean reversion ideal' },
    ],
    moderate: [
      { strategy: 'grid', score: 85, reason: 'Grid with slight bias' },
      { strategy: 'dca', score: 80, reason: 'Steady DCA accumulation' },
    ],
    strong: [
      { strategy: 'swing', score: 80, reason: 'Quiet trend: swing trade' },
      { strategy: 'dca', score: 75, reason: 'DCA in clear direction' },
    ],
  },
  medium: {
    weak: [
      { strategy: 'grid', score: 85, reason: 'Grid in quiet range' },
      { strategy: 'mean-reversion', score: 80, reason: 'Fade small moves' },
    ],
    moderate: [
      { strategy: 'swing', score: 80, reason: 'Swing in low vol trend' },
      { strategy: 'grid', score: 75, reason: 'Grid with trend bias' },
    ],
    strong: [
      { strategy: 'swing', score: 85, reason: 'Clear trend low vol' },
      { strategy: 'smart-entry', score: 80, reason: 'Perfect entry conditions' },
    ],
  },
  high: {
    weak: [
      { strategy: 'grid', score: 80, reason: 'Grid captures oscillations' },
      { strategy: 'mean-reversion', score: 75, reason: 'Mean reversion' },
    ],
    moderate: [
      { strategy: 'swing', score: 80, reason: 'Swing with clear direction' },
      { strategy: 'smart-entry', score: 75, reason: 'Precision entries' },
    ],
    strong: [
      { strategy: 'momentum', score: 80, reason: 'Quiet momentum' },
      { strategy: 'swing', score: 80, reason: 'Swing ride' },
    ],
  },
};
