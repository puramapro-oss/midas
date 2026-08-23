// MIDAS — Trading Types

import type { TradeSide, TradeType, SignalStrength } from '@/types/database';

// --- Market Data ---
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe =
  | '1m' | '3m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h'
  | '1d' | '3d' | '1w' | '1M';

// --- Indicators ---

export interface IndicatorResult {
  name: string;
  value: number | number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  metadata: Record<string, unknown>;
}

// --- Market Regime ---

export type MarketRegimeType =
  | 'trending_up'
  | 'trending_down'
  | 'ranging'
  | 'volatile'
  | 'breakout'
  | 'accumulation'
  | 'distribution'
  | 'capitulation';

export interface MarketRegime {
  type: MarketRegimeType;
  confidence: number;
  volatility: number;
  trend_strength: number;
  volume_profile: 'increasing' | 'decreasing' | 'stable';
  detected_at: number;
  expected_duration_hours: number;
}

// --- Agent Results ---

export interface AgentResult {
  agent_name: string;
  signal: SignalStrength;
  confidence: number;
  direction: TradeSide;
  reasoning: string;
  key_levels: KeyLevel[];
  timeframe: Timeframe;
  metadata: Record<string, unknown>;
}

export interface KeyLevel {
  price: number;
  type: 'support' | 'resistance' | 'pivot' | 'vwap' | 'poc' | 'liquidity';
  strength: number;
  touches: number;
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
  agents_consensus: AgentConsensus;
  risk_assessment: RiskAssessment;
  market_regime: MarketRegime;
  created_at: number;
}

export interface AgentConsensus {
  total_agents: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  avg_confidence: number;
  agreement_score: number;
  divergent_agents: string[];
}

export interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high' | 'extreme';
  risk_score: number;
  max_loss_usd: number;
  max_loss_pct: number;
  risk_reward_ratio: number;
  portfolio_exposure_pct: number;
  correlation_risk: number;
  volatility_risk: number;
  liquidity_risk: number;
  manipulation_risk: number;
  warnings: string[];
}

// --- Trade Estimation ---

export interface TradeEstimate {
  symbol: string;
  side: TradeSide;
  type: TradeType;
  entry_price: number;
  quantity: number;
  leverage: number;
  notional_value_usd: number;
  estimated_fee_usd: number;
  estimated_slippage_pct: number;
  take_profit: number | null;
  stop_loss: number | null;
  risk_reward_ratio: number;
  max_loss_usd: number;
  max_profit_usd: number;
  liquidation_price: number | null;
  margin_required_usd: number;
}

// --- Pre-Trade Simulation ---

export interface PreTradeSimulation {
  trade_estimate: TradeEstimate;
  monte_carlo_results: MonteCarloResult;
  historical_similarity: HistoricalSimilarity[];
  shield_approval: ShieldApproval;
  portfolio_impact: PortfolioImpact;
}

export interface MonteCarloResult {
  simulations_count: number;
  win_probability: number;
  expected_pnl: number;
  median_pnl: number;
  percentile_5: number;
  percentile_95: number;
  max_drawdown_avg: number;
  avg_holding_time_hours: number;
}

export interface HistoricalSimilarity {
  date: string;
  symbol: string;
  regime: MarketRegimeType;
  outcome_pnl_pct: number;
  similarity_score: number;
}

export interface ShieldApproval {
  approved: boolean;
  risk_score: number;
  warnings: string[];
  blocked_reasons: string[];
  suggested_adjustments: SuggestedAdjustment[];
}

export interface SuggestedAdjustment {
  parameter: string;
  current_value: number;
  suggested_value: number;
  reason: string;
}

export interface PortfolioImpact {
  current_exposure_pct: number;
  new_exposure_pct: number;
  max_correlation_with_existing: number;
  diversification_score: number;
  concentration_warning: boolean;
}

// --- Position Management ---

export type PositionAction =
  | 'open'
  | 'close'
  | 'increase'
  | 'decrease'
  | 'move_stop_loss'
  | 'move_take_profit'
  | 'enable_trailing_stop';

export interface PositionUpdate {
  action: PositionAction;
  trade_id: string;
  quantity_delta: number | null;
  new_stop_loss: number | null;
  new_take_profit: number | null;
  trailing_stop_pct: number | null;
  reason: string;
}

// --- Portfolio ---

export interface PortfolioTarget {
  symbol: string;
  target_allocation_pct: number;
  current_allocation_pct: number;
  rebalance_needed: boolean;
  delta_usd: number;
  max_position_usd: number;
  risk_budget_pct: number;
}

export interface PortfolioSnapshot {
  total_value_usd: number;
  cash_available_usd: number;
  positions_value_usd: number;
  unrealized_pnl_usd: number;
  realized_pnl_today_usd: number;
  margin_used_usd: number;
  margin_available_usd: number;
  positions: PortfolioPosition[];
}

export interface PortfolioPosition {
  symbol: string;
  side: TradeSide;
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  leverage: number;
  allocation_pct: number;
  liquidation_price: number | null;
}

// Re-export backtest types
export type {
  BacktestConfig,
  BacktestResult,
  BacktestSummary,
  BacktestTrade,
  EquityPoint,
  MonthlyReturn,
} from './trading-backtest';

// --- Paper Trading ---

export interface PaperTradingConfig {
  initial_capital: number;
  leverage: number;
  fee_rate: number;
  slippage_pct: number;
  exchange: string;
  symbols: string[];
  strategies: string[];
  use_ai_coordinator: boolean;
  max_concurrent_positions: number;
  risk_per_trade_pct: number;
  daily_loss_limit_pct: number;
  is_active: boolean;
}

// --- Shield (Risk Management) ---

export interface ShieldConfig {
  max_daily_loss_pct: number;
  max_daily_loss_usd: number;
  max_position_size_pct: number;
  max_leverage: number;
  max_concurrent_positions: number;
  max_correlation: number;
  min_risk_reward: number;
  min_confidence: number;
  cooldown_after_loss_minutes: number;
  max_consecutive_losses_before_pause: number;
  blacklisted_symbols: string[];
  allowed_hours_utc: [number, number] | null;
  manipulation_detection_enabled: boolean;
  slippage_tolerance_pct: number;
  emergency_stop_enabled: boolean;
}
