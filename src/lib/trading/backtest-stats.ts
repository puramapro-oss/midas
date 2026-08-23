// =============================================================================
// MIDAS — Backtest Statistics
// Performance metrics, equity curves, monthly returns
// =============================================================================

import type { BacktestTrade, BacktestSummary, EquityPoint, MonthlyReturn } from '@/types/trading';

export interface BacktestMetrics {
  peakEquity: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  initialCapital: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  totalFees: number;
}

export function buildSummary(
  trades: BacktestTrade[],
  metrics: BacktestMetrics
): BacktestSummary {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalPnlPct = metrics.initialCapital > 0 ? (totalPnl / metrics.initialCapital) * 100 : 0;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0;

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const returns = trades.map((t) => t.pnl_pct / 100);
  const meanReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  const negativeReturns = returns.filter((r) => r < 0);
  const downsideVariance =
    negativeReturns.length > 1
      ? negativeReturns.reduce((s, r) => s + Math.pow(r, 2), 0) / negativeReturns.length
      : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? (meanReturn / downsideStdDev) * Math.sqrt(252) : 0;

  const holdingTimes = trades.map((t) => {
    const entry = new Date(t.entry_date).getTime();
    const exit = new Date(t.exit_date).getTime();
    return (exit - entry) / (1000 * 60 * 60);
  });
  const avgHoldingTime =
    holdingTimes.length > 0 ? holdingTimes.reduce((s, h) => s + h, 0) / holdingTimes.length : 0;

  const calmarRatio = metrics.maxDrawdownPct > 0 ? totalPnlPct / metrics.maxDrawdownPct : 0;
  const recoveryFactor = metrics.maxDrawdown > 0 ? totalPnl / metrics.maxDrawdown : 0;

  return {
    total_trades: trades.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    win_rate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    total_pnl: totalPnl,
    total_pnl_pct: totalPnlPct,
    max_drawdown: metrics.maxDrawdown,
    max_drawdown_pct: metrics.maxDrawdownPct,
    sharpe_ratio: sharpeRatio,
    sortino_ratio: sortinoRatio,
    profit_factor: profitFactor === Infinity ? 999 : profitFactor,
    avg_win: avgWin,
    avg_loss: avgLoss,
    best_trade: bestTrade,
    worst_trade: worstTrade,
    avg_holding_time_hours: avgHoldingTime,
    max_consecutive_wins: metrics.maxConsecutiveWins,
    max_consecutive_losses: metrics.maxConsecutiveLosses,
    total_fees: metrics.totalFees,
    calmar_ratio: calmarRatio,
    recovery_factor: recoveryFactor,
  };
}

export function buildDrawdownCurve(equityCurve: EquityPoint[]): EquityPoint[] {
  let peak = 0;
  return equityCurve.map((point) => {
    if (point.value > peak) peak = point.value;
    const drawdown = peak > 0 ? ((peak - point.value) / peak) * 100 : 0;
    return { timestamp: point.timestamp, value: drawdown };
  });
}

export function buildMonthlyReturns(trades: BacktestTrade[]): MonthlyReturn[] {
  const monthlyMap = new Map<
    string,
    { pnl: number; trades: number; wins: number }
  >();

  for (const trade of trades) {
    const month = trade.exit_date.slice(0, 7);
    const existing = monthlyMap.get(month) ?? { pnl: 0, trades: 0, wins: 0 };
    existing.pnl += trade.pnl;
    existing.trades += 1;
    if (trade.pnl > 0) existing.wins += 1;
    monthlyMap.set(month, existing);
  }

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      pnl: data.pnl,
      pnl_pct: 0,
      trades: data.trades,
      win_rate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }));
}
