// =============================================================================
// MIDAS — Agent Types
// Types partages par tous les agents d'analyse et le coordinateur
// =============================================================================

export interface AgentResult {
  agent_name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  score: number;
  confidence: number;
  reasoning: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface CoordinatorDecision {
  action: 'buy' | 'sell' | 'hold';
  pair: string;
  composite_score: number;
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  position_size_pct: number;
  strategy: string;
  reasoning: string;
  agent_results: AgentResult[];
  risk_reward_ratio: number;
  approved_by_shield: boolean;
}

export type MarketRegime =
  | 'strong_bull'
  | 'weak_bull'
  | 'ranging'
  | 'weak_bear'
  | 'strong_bear'
  | 'crash'
  | 'high_volatility'
  | 'low_volatility';

export interface MultiTimeframeResult {
  macro: { timeframe: string; trend: 'bullish' | 'bearish' | 'neutral' };
  meso: { timeframe: string; trend: 'bullish' | 'bearish' | 'neutral' };
  micro: { timeframe: string; trend: 'bullish' | 'bearish' | 'neutral' };
  aligned: boolean;
}

export interface ConfluenceAnalysis {
  points: { source: string; signal: 'bullish' | 'bearish'; weight: number }[];
  total_bullish: number;
  total_bearish: number;
  min_required: number;
  met: boolean;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
