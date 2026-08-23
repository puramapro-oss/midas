// MIDAS — Backtesting Types
import type { TradeSide } from '@/types/database';
import type { Timeframe } from './trading';

export interface BacktestConfig {
  symbol: string;
  timeframe: Timeframe;
  strategy: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  leverage: number;
  fee_rate: number;
  slippage_pct: number;
  take_profit_pct: number;
  stop_loss_pct: number;
  trailing_stop: boolean;
  trailing_stop_pct: number;
  max_concurrent_positions: number;
  use_ai_signals: boolean;
  custom_params: Record<string, unknown>;
}

export interface BacktestResult {
  config: BacktestConfig;
  summary: BacktestSummary;
  trades: BacktestTrade[];
  equity_curve: EquityPoint[];
  drawdown_curve: EquityPoint[];
  monthly_returns: MonthlyReturn[];
}

export interface BacktestSummary {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  total_pnl_pct: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  best_trade: number;
  worst_trade: number;
  avg_holding_time_hours: number;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
  total_fees: number;
  calmar_ratio: number;
  recovery_factor: number;
}

export interface BacktestTrade {
  entry_date: string;
  exit_date: string;
  side: TradeSide;
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  pnl_pct: number;
  fees: number;
  signal_confidence: number;
  exit_reason: 'take_profit' | 'stop_loss' | 'trailing_stop' | 'signal_reversal' | 'timeout';
}

export interface EquityPoint {
  timestamp: number;
  value: number;
}

export interface MonthlyReturn {
  month: string;
  pnl: number;
  pnl_pct: number;
  trades: number;
  win_rate: number;
}
