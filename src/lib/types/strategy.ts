// =============================================================================
// MIDAS — Strategy Selector Types
// =============================================================================

export type StrategyName =
  | 'grid'
  | 'momentum'
  | 'mean-reversion'
  | 'scalping'
  | 'swing'
  | 'smart-entry'
  | 'dca';

export interface StrategyScore {
  strategy: StrategyName;
  score: number;
  reason: string;
}

export type VolatilityLevel = 'low' | 'medium' | 'high';
export type TrendLevel = 'weak' | 'moderate' | 'strong';
