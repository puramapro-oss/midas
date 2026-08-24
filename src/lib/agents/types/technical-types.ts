// =============================================================================
// MIDAS — Technical Analysis Types
// Type definitions for technical indicator scores and multi-timeframe analysis
// =============================================================================

import type { MarketRegime, MultiTimeframeResult } from '@/lib/agents/types';
import type { Timeframe } from '../constants/technical-config';

export interface IndicatorScore {
  name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  score: number;
  value: number | string;
  interpretation: string;
}

export interface TechnicalData {
  indicators: IndicatorScore[];
  regime: MarketRegime;
  atr_value: number;
  adx_value: number;
  rsi_value: number;
  current_price: number;
  ema_200: number | null;
}

export interface TimeframeSignal {
  timeframe: Timeframe;
  signal: 'bullish' | 'bearish' | 'neutral';
  score: number;
  confidence: number;
}

export interface MultiTimeframeTechnical {
  per_tf: TimeframeSignal[];
  alignment: MultiTimeframeResult;
  bullish_count: number;
  bearish_count: number;
  aligned_3plus: boolean;
  composite_signal: 'bullish' | 'bearish' | 'neutral';
  composite_score: number;
}
