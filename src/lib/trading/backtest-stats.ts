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
  metrics: BacktestMetrics,
  equityCurve: EquityPoint[] = [],
  periodMs = 86400000,
): BacktestSummary {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalPnlPct = metrics.initialCapital > 0 ? (totalPnl / metrics.initialCapital) * 100 : 0;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0;

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  // Uniform portfolio returns, not trade returns of unequal duration/notional.
  // 365 days describes this continuous crypto simulator; Rf and MAR are assumed
  // zero, not sourced market rates. Square-root annualization assumes no serial
  // correlation (Sharpe 1994), and is disclosed as an approximation.
  const yearMs = 365 * 86400000;
  const validPeriod = Number.isFinite(periodMs) && periodMs > 0;
  const validEquity = validPeriod && equityCurve.length >= 2 && equityCurve.every((point, i) =>
    Number.isFinite(point.value) && point.value > 0 && Number.isFinite(point.timestamp) &&
    (i === 0 || Math.abs(point.timestamp - equityCurve[i - 1].timestamp - periodMs) < 1));
  const warnings: string[] = ['annualization_assumes_uncorrelated_returns'];
  if (!validEquity) warnings.push('invalid_or_irregular_equity');
  const returns = validEquity ? equityCurve.slice(1).map((point, i) => point.value / equityCurve[i].value - 1) : [];
  const scale = validPeriod ? yearMs / periodMs : 0;
  const meanReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = returns.length >= 2 && stdDev > 1e-12 ? (meanReturn / stdDev) * Math.sqrt(scale) : null;

  // Downside semi-deviation uses all observations in its denominator, including
  // a single negative return; positive deviations contribute zero.
  const downsideVariance = returns.length > 0
    ? returns.reduce((sum, value) => sum + Math.min(0, value) ** 2, 0) / returns.length : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = returns.length >= 2 && downsideStdDev > 1e-12 ? (meanReturn / downsideStdDev) * Math.sqrt(scale) : null;

  const holdingTimes = trades.map((t) => {
    const entry = new Date(t.entry_date).getTime();
    const exit = new Date(t.exit_date).getTime();
    return (exit - entry) / (1000 * 60 * 60);
  });
  const avgHoldingTime =
    holdingTimes.length > 0 ? holdingTimes.reduce((s, h) => s + h, 0) / holdingTimes.length : 0;

  const duration = validEquity ? equityCurve.at(-1)!.timestamp - equityCurve[0].timestamp : 0;
  if (duration < 30 * 86400000) warnings.push('short_history_less_than_30_days');
  const finite = (n: number | null) => n !== null && Number.isFinite(n) ? n : null;
  const annualReturn = validEquity && duration > 0
    ? finite(Math.expm1(Math.log(equityCurve.at(-1)!.value / equityCurve[0].value) * yearMs / duration)) : null;
  const calmarRatio = annualReturn !== null && metrics.maxDrawdownPct > 0
    ? finite(annualReturn / (metrics.maxDrawdownPct / 100)) : null;
  const recoveryFactor = metrics.maxDrawdown > 0 ? finite(totalPnl / metrics.maxDrawdown) : null;
  if (sharpeRatio === null) warnings.push('sharpe_undefined');
  if (sortinoRatio === null) warnings.push('sortino_undefined');
  if (profitFactor === null) warnings.push('profit_factor_undefined_without_losses');

  return {
    total_trades: trades.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    breakeven_trades: trades.filter(t => t.pnl === 0).length,
    win_rate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    total_pnl: totalPnl,
    total_pnl_pct: totalPnlPct,
    max_drawdown: metrics.maxDrawdown,
    max_drawdown_pct: metrics.maxDrawdownPct,
    sharpe_ratio: finite(sharpeRatio),
    sortino_ratio: finite(sortinoRatio),
    profit_factor: finite(profitFactor),
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
    annualized_return_pct: annualReturn === null ? null : finite(annualReturn * 100),
    metric_basis: { returns: 'portfolio_equity_per_bar', period_ms: validPeriod ? periodMs : 0,
      periods_per_year: scale, sample_count: returns.length, risk_free_rate_annual: 0,
      minimum_acceptable_return_annual: 0, annualization: 'sqrt_time_assumes_uncorrelated_returns' },
    metric_warnings: warnings,
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

export function buildMonthlyReturns(trades: BacktestTrade[], initialCapital: number): MonthlyReturn[] {
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

  let openingCapital = initialCapital;
  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const percentage = openingCapital > 0 ? data.pnl / openingCapital * 100 : 0;
      openingCapital += data.pnl;
      return { month, pnl: data.pnl, pnl_pct: percentage, trades: data.trades,
        win_rate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0 };
    });
}
