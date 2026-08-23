// MIDAS — AI Agent Types

import type { TradeSide, SignalStrength } from '@/types/database';
import type { Timeframe, KeyLevel, MarketRegimeType } from '@/types/trading';

// --- Agent Base ---
export interface AgentResult {
  agent_name: string;
  signal: SignalStrength;
  confidence: number;
  direction: TradeSide;
  reasoning: string;
  key_levels: KeyLevel[];
  timeframe: Timeframe;
  weight: number;
  execution_time_ms: number;
  metadata: Record<string, unknown>;
}
// --- Coordinator ---

export interface CoordinatorDecision {
  action: 'buy' | 'sell' | 'hold' | 'close';
  confidence: number;
  symbol: string;
  timeframe: Timeframe;
  entry_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  position_size_pct: number;
  leverage: number;
  reasoning: string;
  agents: AgentResult[];
  weights: DynamicWeighting;
  market_regime: MarketRegimeType;
  created_at: number;
}
// --- Multi-Timeframe ---

export interface MultiTimeframeResult {
  symbol: string;
  timeframes: TimeframeAnalysis[];
  overall_bias: TradeSide | 'neutral';
  overall_confidence: number;
  alignment_score: number;
  dominant_timeframe: Timeframe;
  conflicts: TimeframeConflict[];
}

export interface TimeframeAnalysis {
  timeframe: Timeframe;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  key_levels: KeyLevel[];
  indicators_summary: Record<string, number>;
}

export interface TimeframeConflict {
  timeframe_a: Timeframe;
  timeframe_b: Timeframe;
  signal_a: SignalStrength;
  signal_b: SignalStrength;
  severity: 'minor' | 'major';
}
// --- Confluence ---

export interface ConfluenceAnalysis {
  symbol: string;
  total_factors: number;
  bullish_factors: ConfluenceFactor[];
  bearish_factors: ConfluenceFactor[];
  confluence_score: number;
  high_confluence_zones: ConfluenceZone[];
  recommendation: SignalStrength;
}

export interface ConfluenceFactor {
  name: string;
  source: string;
  weight: number;
  description: string;
}

export interface ConfluenceZone {
  price_low: number;
  price_high: number;
  type: 'support' | 'resistance';
  factors_count: number;
  factors: string[];
  strength: number;
}
// Re-export advanced analysis types
export type {
  SmartMoneyAnalysis,
  LiquidityPool,
  OrderBlock,
  FairValueGap,
  BreakerBlock,
  MarketStructure,
  StructureBreak,
} from './ai-advanced';
export type { WyckoffPhase, WyckoffAnalysis, WyckoffVolumeAnalysis, WyckoffEvent } from './ai-advanced';
export type {
  OrderFlowAnalysis,
  LargeOrder,
  OrderImbalance,
  FootprintCluster,
  WhaleActivity,
} from './ai-advanced';
export type { DerivativesAnalysis, LiquidationLevel } from './ai-advanced';
// --- Correlation ---

export interface CorrelationAnalysis {
  symbol: string;
  btc_correlation: number;
  eth_correlation: number;
  sp500_correlation: number;
  dxy_correlation: number;
  sector_correlation: number;
  correlated_assets: AssetCorrelation[];
  decorrelation_opportunity: boolean;
  regime_correlation_shift: boolean;
}

export interface AssetCorrelation {
  asset: string;
  correlation: number;
  timeframe: Timeframe;
  is_leading: boolean;
  lead_time_candles: number;
}
// --- Social / Dominance ---

export interface SocialDominanceAnalysis {
  symbol: string;
  social_volume: number;
  social_volume_change_24h: number;
  social_dominance_pct: number;
  sentiment_score: number;
  sentiment_label: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  fear_greed_index: number;
  trending_score: number;
  influencer_mentions: InfluencerMention[];
  news_sentiment: NewsSentiment;
}

export interface InfluencerMention {
  source: string;
  author: string;
  followers: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  timestamp: number;
}

export interface NewsSentiment {
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  weighted_score: number;
  top_headlines: NewsHeadline[];
}

export interface NewsHeadline {
  title: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance_score: number;
  published_at: string;
}
// --- Manipulation Detection ---

export interface ManipulationDetection {
  symbol: string;
  is_manipulated: boolean;
  confidence: number;
  detected_patterns: ManipulationPattern[];
  risk_level: 'safe' | 'caution' | 'warning' | 'danger';
  recommendation: string;
}

export interface ManipulationPattern {
  type:
    | 'spoofing'
    | 'layering'
    | 'wash_trading'
    | 'pump_and_dump'
    | 'stop_hunting'
    | 'front_running'
    | 'marking_close'
    | 'fake_breakout';
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  detected_at: number;
  estimated_size_usd: number;
}
// --- Dynamic Weighting ---

export interface DynamicWeighting {
  weights: AgentWeight[];
  regime_adjustments: Record<string, number>;
  confidence_threshold: number;
  total_weight: number;
  methodology: string;
}

export interface AgentWeight {
  agent_name: string;
  base_weight: number;
  regime_adjusted_weight: number;
  performance_adjusted_weight: number;
  final_weight: number;
  recent_accuracy: number;
  total_signals: number;
}
