// =============================================================================
// MIDAS — AI Agent Types
// Types pour les agents IA, le coordinateur, et les analyses multi-sources
// =============================================================================

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

// --- Smart Money ---

export interface SmartMoneyAnalysis {
  symbol: string;
  institutional_bias: TradeSide | 'neutral';
  confidence: number;
  liquidity_pools: LiquidityPool[];
  order_blocks: OrderBlock[];
  fair_value_gaps: FairValueGap[];
  breaker_blocks: BreakerBlock[];
  market_structure: MarketStructure;
}

export interface LiquidityPool {
  price: number;
  type: 'buy_side' | 'sell_side';
  estimated_volume: number;
  distance_pct: number;
  likelihood_of_sweep: number;
}

export interface OrderBlock {
  price_high: number;
  price_low: number;
  type: 'bullish' | 'bearish';
  strength: number;
  tested: boolean;
  origin_timestamp: number;
}

export interface FairValueGap {
  price_high: number;
  price_low: number;
  type: 'bullish' | 'bearish';
  filled_pct: number;
  age_candles: number;
}

export interface BreakerBlock {
  price_high: number;
  price_low: number;
  type: 'bullish' | 'bearish';
  original_order_block_broken: boolean;
}

export interface MarketStructure {
  trend: 'bullish' | 'bearish' | 'neutral';
  last_bos: StructureBreak | null;
  last_choch: StructureBreak | null;
  swing_highs: number[];
  swing_lows: number[];
}

export interface StructureBreak {
  price: number;
  type: 'bos' | 'choch';
  direction: 'bullish' | 'bearish';
  timestamp: number;
}

// --- Wyckoff ---

export type WyckoffPhase =
  | 'accumulation_a'
  | 'accumulation_b'
  | 'accumulation_c'
  | 'accumulation_d'
  | 'accumulation_e'
  | 'distribution_a'
  | 'distribution_b'
  | 'distribution_c'
  | 'distribution_d'
  | 'distribution_e'
  | 'markup'
  | 'markdown'
  | 'unknown';

export interface WyckoffAnalysis {
  symbol: string;
  phase: WyckoffPhase;
  confidence: number;
  phase_progress_pct: number;
  spring_detected: boolean;
  upthrust_detected: boolean;
  volume_analysis: WyckoffVolumeAnalysis;
  expected_next_phase: WyckoffPhase;
  expected_direction: TradeSide | 'neutral';
  key_events: WyckoffEvent[];
}

export interface WyckoffVolumeAnalysis {
  volume_trend: 'increasing' | 'decreasing' | 'stable';
  effort_vs_result: 'confirming' | 'diverging';
  climax_volume_detected: boolean;
  no_demand_detected: boolean;
  no_supply_detected: boolean;
}

export interface WyckoffEvent {
  type: string;
  price: number;
  timestamp: number;
  description: string;
}

// --- Order Flow ---

export interface OrderFlowAnalysis {
  symbol: string;
  delta: number;
  cumulative_delta: number;
  delta_divergence: boolean;
  absorption_detected: boolean;
  absorption_side: TradeSide | null;
  large_orders: LargeOrder[];
  imbalances: OrderImbalance[];
  footprint_clusters: FootprintCluster[];
  aggression_ratio: number;
  whale_activity: WhaleActivity;
}

export interface LargeOrder {
  price: number;
  size_usd: number;
  side: TradeSide;
  timestamp: number;
  is_iceberg: boolean;
}

export interface OrderImbalance {
  price: number;
  bid_volume: number;
  ask_volume: number;
  imbalance_ratio: number;
  type: 'bid_heavy' | 'ask_heavy';
}

export interface FootprintCluster {
  price: number;
  buy_volume: number;
  sell_volume: number;
  delta: number;
  is_poc: boolean;
}

export interface WhaleActivity {
  detected: boolean;
  direction: TradeSide | null;
  estimated_size_usd: number;
  confidence: number;
  recent_trades: LargeOrder[];
}

// --- Derivatives ---

export interface DerivativesAnalysis {
  symbol: string;
  funding_rate: number;
  funding_rate_annualized: number;
  funding_sentiment: 'extreme_long' | 'long' | 'neutral' | 'short' | 'extreme_short';
  open_interest: number;
  open_interest_change_24h: number;
  oi_sentiment: 'bullish' | 'bearish' | 'neutral';
  long_short_ratio: number;
  top_trader_long_short_ratio: number;
  liquidation_heatmap: LiquidationLevel[];
  max_pain_price: number;
  options_sentiment: 'bullish' | 'bearish' | 'neutral' | null;
  put_call_ratio: number | null;
  basis: number;
  basis_annualized: number;
}

export interface LiquidationLevel {
  price: number;
  long_liquidation_usd: number;
  short_liquidation_usd: number;
  total_usd: number;
}

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
