// =============================================================================
// MIDAS — Strategy Matrix: Bull Markets
// =============================================================================

import type { StrategyScore, VolatilityLevel, TrendLevel } from './strategy-matrix-types';

export const STRATEGY_MATRIX_BULL: Record<
  'strong_bull' | 'weak_bull',
  Record<VolatilityLevel, Record<TrendLevel, StrategyScore[]>>
> = {
  strong_bull: {
    low: {
      weak: [
        { strategy: 'dca', score: 80, reason: 'Low vol bull: DCA safe accumulation' },
        { strategy: 'swing', score: 70, reason: 'Swing on pullbacks in bull' },
      ],
      moderate: [
        { strategy: 'momentum', score: 90, reason: 'Moderate trend bull: momentum ideal' },
        { strategy: 'swing', score: 75, reason: 'Swing with confirmed trend' },
      ],
      strong: [
        { strategy: 'momentum', score: 95, reason: 'Strong bull trend: max momentum' },
        { strategy: 'smart-entry', score: 80, reason: 'Smart entry on retracements' },
      ],
    },
    medium: {
      weak: [
        { strategy: 'grid', score: 75, reason: 'Medium vol range: grid works' },
        { strategy: 'mean-reversion', score: 70, reason: 'Mean reversion in choppy bull' },
      ],
      moderate: [
        { strategy: 'momentum', score: 85, reason: 'Momentum with vol management' },
        { strategy: 'swing', score: 80, reason: 'Swing with wider stops' },
      ],
      strong: [
        { strategy: 'momentum', score: 90, reason: 'Strong trend compensates vol' },
        { strategy: 'smart-entry', score: 85, reason: 'Smart entry on vol dips' },
      ],
    },
    high: {
      weak: [
        { strategy: 'scalping', score: 70, reason: 'High vol low trend: quick scalps' },
        { strategy: 'grid', score: 65, reason: 'Wide grid in volatile bull' },
      ],
      moderate: [
        { strategy: 'scalping', score: 75, reason: 'Scalp the high-vol swings' },
        { strategy: 'momentum', score: 70, reason: 'Momentum with tight risk' },
      ],
      strong: [
        { strategy: 'momentum', score: 85, reason: 'Strong trend trumps high vol' },
        { strategy: 'scalping', score: 75, reason: 'Scalp between momentum bursts' },
      ],
    },
  },
  weak_bull: {
    low: {
      weak: [
        { strategy: 'dca', score: 85, reason: 'Weak bull low vol: safe DCA' },
        { strategy: 'grid', score: 75, reason: 'Grid in quiet market' },
      ],
      moderate: [
        { strategy: 'swing', score: 80, reason: 'Swing in emerging trend' },
        { strategy: 'smart-entry', score: 75, reason: 'Patient entries' },
      ],
      strong: [
        { strategy: 'momentum', score: 80, reason: 'Momentum as trend confirms' },
        { strategy: 'swing', score: 75, reason: 'Swing with trend' },
      ],
    },
    medium: {
      weak: [
        { strategy: 'grid', score: 80, reason: 'Grid captures range oscillations' },
        { strategy: 'mean-reversion', score: 75, reason: 'Mean reversion in range' },
      ],
      moderate: [
        { strategy: 'swing', score: 80, reason: 'Swing trading optimal' },
        { strategy: 'mean-reversion', score: 70, reason: 'Mean reversion on extremes' },
      ],
      strong: [
        { strategy: 'momentum', score: 80, reason: 'Follow the trend' },
        { strategy: 'swing', score: 75, reason: 'Swing with momentum' },
      ],
    },
    high: {
      weak: [
        { strategy: 'scalping', score: 75, reason: 'Quick scalps in choppy market' },
        { strategy: 'mean-reversion', score: 70, reason: 'Fade the extremes' },
      ],
      moderate: [
        { strategy: 'scalping', score: 75, reason: 'Scalp with moderate edge' },
        { strategy: 'grid', score: 70, reason: 'Grid with wider spacing' },
      ],
      strong: [
        { strategy: 'momentum', score: 75, reason: 'Momentum despite volatility' },
        { strategy: 'scalping', score: 70, reason: 'Quick trades reduce risk' },
      ],
    },
  },
};
