// =============================================================================
// MIDAS — Strategy Selector
// Maps market conditions (regime, volatility, trend strength) to best strategy
// =============================================================================

import type { MarketRegime } from '@/lib/agents/types';
import {
  STRATEGY_MATRIX,
  type StrategyName,
  type StrategyScore,
  type VolatilityLevel,
  type TrendLevel,
} from './constants/strategy-matrix';

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
