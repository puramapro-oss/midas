// MIDAS — AI Advanced Analysis Types
import type { TradeSide } from '@/types/database';
import type { Timeframe } from '@/types/trading';

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
  | 'accumulation_a' | 'accumulation_b' | 'accumulation_c' | 'accumulation_d' | 'accumulation_e'
  | 'distribution_a' | 'distribution_b' | 'distribution_c' | 'distribution_d' | 'distribution_e'
  | 'markup' | 'markdown' | 'unknown';

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
