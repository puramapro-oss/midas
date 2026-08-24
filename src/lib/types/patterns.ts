// =============================================================================
// MIDAS — Pattern Detection Types
// =============================================================================

export type PatternType =
  | 'double_top'
  | 'double_bottom'
  | 'higher_high'
  | 'lower_low'
  | 'higher_low'
  | 'lower_high'
  | 'support_test'
  | 'resistance_test'
  | 'breakout_up'
  | 'breakout_down';

export interface DetectedPattern {
  type: PatternType;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  price_level: number;
  description: string;
}

export interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  timestamp: number;
}

export interface SupportResistance {
  level: number;
  type: 'support' | 'resistance';
  touches: number;
  strength: number;
}

export interface PatternData {
  patterns: DetectedPattern[];
  advanced_patterns: import('@/lib/analysis/patterns-advanced').AdvancedPattern[];
  swing_highs: Array<{ price: number; timestamp: number }>;
  swing_lows: Array<{ price: number; timestamp: number }>;
  support_levels: SupportResistance[];
  resistance_levels: SupportResistance[];
  market_structure: 'bullish' | 'bearish' | 'neutral';
}
