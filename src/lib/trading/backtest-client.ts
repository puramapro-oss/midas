import type { BacktestResult } from '@/types/trading';
import { historicalWindow, type CandleInterval } from '../exchange/candle-contract.ts';
import { backtestWarmup } from './backtest-contract.ts';
export interface BacktestRequest {
  pair: string; strategy: string; timeframe: string; capital: number;
  startDate: string; endDate: string; stopLossPct: number; takeProfitPct: number;
}
export interface BacktestReply {
  result: BacktestResult;
  market_data_source: string;
  coverage: { complete: true; first_open_time: number; end_exclusive: number; candles: number; warmup_candles: number };
}

export async function requestBacktest(request: BacktestRequest, signal?: AbortSignal): Promise<BacktestReply> {
  const response = await fetch('/api/backtest/run', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request), signal });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : `Simulation indisponible (${response.status})`);
  const summary = body?.result?.summary;
  const config = body?.result?.config;
  const coverage = body?.coverage;
  const requestedWindow = historicalWindow(Date.parse(request.startDate), Date.parse(request.endDate), request.timeframe as CandleInterval);
  if (!summary || !config || config.symbol !== request.pair || config.strategy !== request.strategy ||
      config.timeframe !== request.timeframe || config.initial_capital !== request.capital ||
      config.start_date !== request.startDate || config.end_date !== request.endDate ||
      config.stop_loss_pct !== request.stopLossPct || config.take_profit_pct !== request.takeProfitPct ||
      !coverage || coverage.complete !== true || !Number.isFinite(coverage.first_open_time) ||
      !Number.isFinite(coverage.end_exclusive) || coverage.end_exclusive <= coverage.first_open_time ||
      coverage.first_open_time !== requestedWindow.first || coverage.end_exclusive !== requestedWindow.endExclusive ||
      coverage.candles !== requestedWindow.count || coverage.warmup_candles !== backtestWarmup(request.strategy) ||
      typeof body.market_data_source !== 'string' || !body.market_data_source.trim()) {
    throw new Error('Réponse de simulation incohérente ou incomplète');
  }
  for (const name of ['total_pnl', 'total_pnl_pct', 'total_trades', 'win_rate', 'max_drawdown_pct',
    'avg_holding_time_hours', 'best_trade', 'worst_trade', 'total_fees']) {
    if (typeof summary[name] !== 'number' || !Number.isFinite(summary[name])) throw new Error('Résultat financier invalide');
  }
  for (const name of ['sharpe_ratio', 'sortino_ratio', 'profit_factor']) {
    if (summary[name] !== null && (typeof summary[name] !== 'number' || !Number.isFinite(summary[name]))) throw new Error('Ratio financier invalide');
  }
  return body as BacktestReply;
}
