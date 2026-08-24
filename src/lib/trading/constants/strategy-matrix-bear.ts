// =============================================================================
// MIDAS — Strategy Matrix: Bear Markets
// =============================================================================

import type { StrategyScore, VolatilityLevel, TrendLevel } from './strategy-matrix-types';

export const STRATEGY_MATRIX_BEAR: Record<
  'weak_bear' | 'strong_bear',
  Record<VolatilityLevel, Record<TrendLevel, StrategyScore[]>>
> = {
  weak_bear: {
    low: {
      weak: [
        { strategy: 'grid', score: 75, reason: 'Grid in slow decline' },
        { strategy: 'dca', score: 70, reason: 'Cautious DCA at supports' },
      ],
      moderate: [
        { strategy: 'swing', score: 75, reason: 'Short swings on bounces' },
        { strategy: 'mean-reversion', score: 70, reason: 'Fade bear rallies' },
      ],
      strong: [
        { strategy: 'momentum', score: 75, reason: 'Short momentum trades' },
        { strategy: 'swing', score: 70, reason: 'Swing short' },
      ],
    },
    medium: {
      weak: [
        { strategy: 'mean-reversion', score: 75, reason: 'Fade oversold bounces' },
        { strategy: 'grid', score: 70, reason: 'Grid in bear range' },
      ],
      moderate: [
        { strategy: 'swing', score: 75, reason: 'Swing with bear bias' },
        { strategy: 'scalping', score: 70, reason: 'Quick scalps on bounces' },
      ],
      strong: [
        { strategy: 'momentum', score: 80, reason: 'Short momentum in bear' },
        { strategy: 'smart-entry', score: 70, reason: 'Wait for setup' },
      ],
    },
    high: {
      weak: [
        { strategy: 'scalping', score: 75, reason: 'Scalp choppy bear' },
        { strategy: 'mean-reversion', score: 65, reason: 'Risky mean reversion' },
      ],
      moderate: [
        { strategy: 'scalping', score: 75, reason: 'Quick trades in volatile bear' },
        { strategy: 'momentum', score: 70, reason: 'Short momentum bursts' },
      ],
      strong: [
        { strategy: 'momentum', score: 80, reason: 'Strong bear momentum' },
        { strategy: 'scalping', score: 70, reason: 'Scalp between drops' },
      ],
    },
  },
  strong_bear: {
    low: {
      weak: [
        { strategy: 'dca', score: 60, reason: 'Minimal DCA at deep supports only' },
        { strategy: 'smart-entry', score: 70, reason: 'Wait for reversal signals' },
      ],
      moderate: [
        { strategy: 'momentum', score: 75, reason: 'Short momentum in bear' },
        { strategy: 'smart-entry', score: 70, reason: 'Careful entries only' },
      ],
      strong: [
        { strategy: 'momentum', score: 85, reason: 'Strong bear: ride the shorts' },
        { strategy: 'swing', score: 70, reason: 'Short swings' },
      ],
    },
    medium: {
      weak: [
        { strategy: 'smart-entry', score: 70, reason: 'Extreme caution in bear' },
        { strategy: 'scalping', score: 65, reason: 'Quick scalps only' },
      ],
      moderate: [
        { strategy: 'momentum', score: 80, reason: 'Bear momentum shorts' },
        { strategy: 'scalping', score: 70, reason: 'Scalp the drops' },
      ],
      strong: [
        { strategy: 'momentum', score: 90, reason: 'Max bear momentum' },
        { strategy: 'swing', score: 75, reason: 'Short swing trades' },
      ],
    },
    high: {
      weak: [
        { strategy: 'scalping', score: 65, reason: 'Only quick scalps in panic' },
        { strategy: 'smart-entry', score: 60, reason: 'Wait for capitulation end' },
      ],
      moderate: [
        { strategy: 'scalping', score: 70, reason: 'Scalp volatile bear' },
        { strategy: 'momentum', score: 75, reason: 'Short momentum' },
      ],
      strong: [
        { strategy: 'momentum', score: 85, reason: 'Crash momentum shorts' },
        { strategy: 'scalping', score: 70, reason: 'Scalp between crashes' },
      ],
    },
  },
};
