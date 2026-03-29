// =============================================================================
// MIDAS — Backtest Engine
// Simulate trading strategies on historical candle data
// =============================================================================

import type { Candle } from '@/types/trading';
import type {
  BacktestConfig,
  BacktestResult,
  BacktestSummary,
  BacktestTrade,
  EquityPoint,
  MonthlyReturn,
} from '@/types/trading';
import { BaseStrategy, type StrategySignal } from './strategies/base-strategy';

interface BacktestState {
  capital: number;
  initialCapital: number;
  position: ActivePosition | null;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  peakEquity: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  totalFees: number;
}

interface ActivePosition {
  side: 'buy' | 'sell';
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  trailingStopHighest: number;
  trailingStopLowest: number;
  entryDate: string;
  confidence: number;
}

export async function runBacktest(
  config: BacktestConfig,
  candles: Candle[],
  strategy: BaseStrategy
): Promise<BacktestResult> {
  if (candles.length === 0) {
    return emptyResult(config);
  }

  const state: BacktestState = {
    capital: config.initial_capital,
    initialCapital: config.initial_capital,
    position: null,
    trades: [],
    equityCurve: [{ timestamp: candles[0]?.timestamp ?? 0, value: config.initial_capital }],
    peakEquity: config.initial_capital,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    totalFees: 0,
  };

  // Need enough candles for indicator warmup
  const warmupPeriod = 50;
  if (candles.length <= warmupPeriod) {
    return emptyResult(config);
  }

  for (let i = warmupPeriod; i < candles.length; i++) {
    const currentCandle = candles[i];
    if (!currentCandle) continue;

    const candleSlice = candles.slice(0, i + 1);

    // Check if current position needs closing
    if (state.position) {
      const closeResult = checkPositionClose(state.position, currentCandle, config);
      if (closeResult) {
        closeTrade(state, closeResult.exitPrice, closeResult.reason, currentCandle, config);
        // If we just closed, still evaluate for new signal on same candle
      }
    }

    // Only open new position if we don't already have one
    if (!state.position) {
      try {
        const signal = await strategy.analyze(candleSlice, {});
        if (signal.action !== 'hold' && signal.confidence >= 0.4) {
          openTrade(state, signal, currentCandle, config);
        }
      } catch {
        // Skip candle on analysis error (insufficient data etc.)
      }
    }

    // Update equity curve
    const equity = calculateEquity(state, currentCandle);
    state.equityCurve.push({ timestamp: currentCandle.timestamp, value: equity });

    // Track drawdown
    if (equity > state.peakEquity) {
      state.peakEquity = equity;
    }
    const drawdown = state.peakEquity - equity;
    const drawdownPct = state.peakEquity > 0 ? (drawdown / state.peakEquity) * 100 : 0;
    if (drawdown > state.maxDrawdown) {
      state.maxDrawdown = drawdown;
      state.maxDrawdownPct = drawdownPct;
    }
  }

  // Close any remaining position at last candle
  if (state.position && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      closeTrade(state, lastCandle.close, 'timeout', lastCandle, config);
    }
  }

  return {
    config,
    summary: buildSummary(state),
    trades: state.trades,
    equity_curve: state.equityCurve,
    drawdown_curve: buildDrawdownCurve(state.equityCurve),
    monthly_returns: buildMonthlyReturns(state.trades),
  };
}

function openTrade(
  state: BacktestState,
  signal: StrategySignal,
  candle: Candle,
  config: BacktestConfig
): void {
  const entryPrice = candle.close * (1 + config.slippage_pct / 100 * (signal.action === 'buy' ? 1 : -1));
  const riskPerTrade = state.capital * 0.02; // 2% risk
  const priceDiff = Math.abs(entryPrice - signal.stop_loss);

  if (priceDiff === 0) return;

  const quantity = riskPerTrade / priceDiff;
  const fee = quantity * entryPrice * config.fee_rate;

  if (quantity * entryPrice > state.capital - fee) return;

  state.capital -= fee;
  state.totalFees += fee;

  state.position = {
    side: signal.action === 'buy' ? 'buy' : 'sell',
    entryPrice,
    quantity,
    stopLoss: signal.stop_loss,
    takeProfit: signal.take_profit,
    trailingStopHighest: entryPrice,
    trailingStopLowest: entryPrice,
    entryDate: new Date(candle.timestamp).toISOString(),
    confidence: signal.confidence,
  };
}

function checkPositionClose(
  position: ActivePosition,
  candle: Candle,
  config: BacktestConfig
): { exitPrice: number; reason: BacktestTrade['exit_reason'] } | null {
  if (position.side === 'buy') {
    // Stop loss
    if (candle.low <= position.stopLoss) {
      return { exitPrice: position.stopLoss, reason: 'stop_loss' };
    }
    // Take profit
    if (candle.high >= position.takeProfit) {
      return { exitPrice: position.takeProfit, reason: 'take_profit' };
    }
    // Trailing stop
    if (config.trailing_stop && config.trailing_stop_pct > 0) {
      const newHigh = Math.max(position.trailingStopHighest, candle.high);
      position.trailingStopHighest = newHigh;
      const trailLevel = newHigh * (1 - config.trailing_stop_pct / 100);
      if (candle.low <= trailLevel && trailLevel > position.entryPrice) {
        return { exitPrice: trailLevel, reason: 'trailing_stop' };
      }
    }
  } else {
    // Short position
    if (candle.high >= position.stopLoss) {
      return { exitPrice: position.stopLoss, reason: 'stop_loss' };
    }
    if (candle.low <= position.takeProfit) {
      return { exitPrice: position.takeProfit, reason: 'take_profit' };
    }
    if (config.trailing_stop && config.trailing_stop_pct > 0) {
      const newLow = Math.min(position.trailingStopLowest, candle.low);
      position.trailingStopLowest = newLow;
      const trailLevel = newLow * (1 + config.trailing_stop_pct / 100);
      if (candle.high >= trailLevel && trailLevel < position.entryPrice) {
        return { exitPrice: trailLevel, reason: 'trailing_stop' };
      }
    }
  }

  return null;
}

function closeTrade(
  state: BacktestState,
  exitPrice: number,
  reason: BacktestTrade['exit_reason'],
  candle: Candle,
  config: BacktestConfig
): void {
  if (!state.position) return;

  const pos = state.position;
  const slippageAdjusted = exitPrice * (1 + config.slippage_pct / 100 * (pos.side === 'buy' ? -1 : 1));
  const fee = pos.quantity * slippageAdjusted * config.fee_rate;

  const rawPnl =
    pos.side === 'buy'
      ? (slippageAdjusted - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - slippageAdjusted) * pos.quantity;

  const netPnl = rawPnl - fee;
  const pnlPct = pos.entryPrice > 0 ? (rawPnl / (pos.entryPrice * pos.quantity)) * 100 : 0;

  state.capital += netPnl + pos.quantity * pos.entryPrice; // Return capital + PnL
  state.totalFees += fee;

  // Track consecutive wins/losses
  if (netPnl > 0) {
    state.consecutiveWins++;
    state.consecutiveLosses = 0;
    state.maxConsecutiveWins = Math.max(state.maxConsecutiveWins, state.consecutiveWins);
  } else {
    state.consecutiveLosses++;
    state.consecutiveWins = 0;
    state.maxConsecutiveLosses = Math.max(state.maxConsecutiveLosses, state.consecutiveLosses);
  }

  state.trades.push({
    entry_date: pos.entryDate,
    exit_date: new Date(candle.timestamp).toISOString(),
    side: pos.side,
    entry_price: pos.entryPrice,
    exit_price: slippageAdjusted,
    quantity: pos.quantity,
    pnl: netPnl,
    pnl_pct: pnlPct,
    fees: fee,
    signal_confidence: pos.confidence,
    exit_reason: reason,
  });

  state.position = null;
}

function calculateEquity(state: BacktestState, candle: Candle): number {
  if (!state.position) return state.capital;

  const pos = state.position;
  const unrealizedPnl =
    pos.side === 'buy'
      ? (candle.close - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - candle.close) * pos.quantity;

  return state.capital + unrealizedPnl;
}

function buildSummary(state: BacktestState): BacktestSummary {
  const trades = state.trades;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalPnlPct = state.initialCapital > 0 ? (totalPnl / state.initialCapital) * 100 : 0;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0;

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Sharpe ratio (annualized, assuming daily returns)
  const returns = trades.map((t) => t.pnl_pct / 100);
  const meanReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  // Sortino ratio (downside deviation only)
  const negativeReturns = returns.filter((r) => r < 0);
  const downsideVariance =
    negativeReturns.length > 1
      ? negativeReturns.reduce((s, r) => s + Math.pow(r, 2), 0) / negativeReturns.length
      : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? (meanReturn / downsideStdDev) * Math.sqrt(252) : 0;

  // Average holding time
  const holdingTimes = trades.map((t) => {
    const entry = new Date(t.entry_date).getTime();
    const exit = new Date(t.exit_date).getTime();
    return (exit - entry) / (1000 * 60 * 60); // hours
  });
  const avgHoldingTime =
    holdingTimes.length > 0 ? holdingTimes.reduce((s, h) => s + h, 0) / holdingTimes.length : 0;

  // Calmar ratio
  const calmarRatio = state.maxDrawdownPct > 0 ? totalPnlPct / state.maxDrawdownPct : 0;

  // Recovery factor
  const recoveryFactor = state.maxDrawdown > 0 ? totalPnl / state.maxDrawdown : 0;

  return {
    total_trades: trades.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    win_rate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    total_pnl: totalPnl,
    total_pnl_pct: totalPnlPct,
    max_drawdown: state.maxDrawdown,
    max_drawdown_pct: state.maxDrawdownPct,
    sharpe_ratio: sharpeRatio,
    sortino_ratio: sortinoRatio,
    profit_factor: profitFactor === Infinity ? 999 : profitFactor,
    avg_win: avgWin,
    avg_loss: avgLoss,
    best_trade: bestTrade,
    worst_trade: worstTrade,
    avg_holding_time_hours: avgHoldingTime,
    max_consecutive_wins: state.maxConsecutiveWins,
    max_consecutive_losses: state.maxConsecutiveLosses,
    total_fees: state.totalFees,
    calmar_ratio: calmarRatio,
    recovery_factor: recoveryFactor,
  };
}

function buildDrawdownCurve(equityCurve: EquityPoint[]): EquityPoint[] {
  let peak = 0;
  return equityCurve.map((point) => {
    if (point.value > peak) peak = point.value;
    const drawdown = peak > 0 ? ((peak - point.value) / peak) * 100 : 0;
    return { timestamp: point.timestamp, value: drawdown };
  });
}

function buildMonthlyReturns(trades: BacktestTrade[]): MonthlyReturn[] {
  const monthlyMap = new Map<
    string,
    { pnl: number; trades: number; wins: number }
  >();

  for (const trade of trades) {
    const month = trade.exit_date.slice(0, 7); // YYYY-MM
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
      pnl_pct: 0, // Would need running capital to compute accurately
      trades: data.trades,
      win_rate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }));
}

function emptyResult(config: BacktestConfig): BacktestResult {
  return {
    config,
    summary: {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      total_pnl: 0,
      total_pnl_pct: 0,
      max_drawdown: 0,
      max_drawdown_pct: 0,
      sharpe_ratio: 0,
      sortino_ratio: 0,
      profit_factor: 0,
      avg_win: 0,
      avg_loss: 0,
      best_trade: 0,
      worst_trade: 0,
      avg_holding_time_hours: 0,
      max_consecutive_wins: 0,
      max_consecutive_losses: 0,
      total_fees: 0,
      calmar_ratio: 0,
      recovery_factor: 0,
    },
    trades: [],
    equity_curve: [],
    drawdown_curve: [],
    monthly_returns: [],
  };
}
