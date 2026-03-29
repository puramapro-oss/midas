// =============================================================================
// MIDAS — Strategy Selector
// Maps market conditions (regime, volatility, trend strength) to best strategy
// =============================================================================

import type { MarketRegime } from '@/lib/agents/types';

export type StrategyName =
  | 'grid'
  | 'momentum'
  | 'mean-reversion'
  | 'scalping'
  | 'swing'
  | 'smart-entry'
  | 'dca';

interface StrategyScore {
  strategy: StrategyName;
  score: number;
  reason: string;
}

type VolatilityLevel = 'low' | 'medium' | 'high';
type TrendLevel = 'weak' | 'moderate' | 'strong';

// Strategy suitability matrix: [regime][volatility][trend] -> strategies with scores
const STRATEGY_MATRIX: Record<
  MarketRegime,
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
  ranging: {
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
  },
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
  crash: {
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
  },
  high_volatility: {
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
  },
  low_volatility: {
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
  },
};

function classifyVolatility(volatility: number): VolatilityLevel {
  if (volatility < 0.3) return 'low';
  if (volatility < 0.7) return 'medium';
  return 'high';
}

function classifyTrend(trendStrength: number): TrendLevel {
  if (trendStrength < 0.3) return 'weak';
  if (trendStrength < 0.6) return 'moderate';
  return 'strong';
}

/**
 * Select the best strategy given current market conditions.
 * @param regime Market regime string from agent analysis
 * @param volatility 0-1 normalized volatility score
 * @param trendStrength 0-1 normalized trend strength
 * @returns Best strategy name
 */
export function selectStrategy(
  regime: MarketRegime,
  volatility: number,
  trendStrength: number
): StrategyName {
  const vol = classifyVolatility(volatility);
  const trend = classifyTrend(trendStrength);

  const candidates = STRATEGY_MATRIX[regime]?.[vol]?.[trend];

  if (!candidates || candidates.length === 0) {
    // Fallback to smart-entry (most conservative)
    return 'smart-entry';
  }

  // Return highest scoring strategy
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  return sorted[0]?.strategy ?? 'smart-entry';
}

/**
 * Get detailed strategy recommendations with scores and reasoning.
 */
export function getStrategyRecommendations(
  regime: MarketRegime,
  volatility: number,
  trendStrength: number
): StrategyScore[] {
  const vol = classifyVolatility(volatility);
  const trend = classifyTrend(trendStrength);

  const candidates = STRATEGY_MATRIX[regime]?.[vol]?.[trend];

  if (!candidates || candidates.length === 0) {
    return [{ strategy: 'smart-entry', score: 50, reason: 'Default fallback — conditions unclear' }];
  }

  return [...candidates].sort((a, b) => b.score - a.score);
}
