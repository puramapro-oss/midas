// =============================================================================
// MIDAS — Backtest Engine
// Simulate trading strategies on historical candle data
// =============================================================================

import type { Candle } from '@/types/trading';
import type {
  BacktestConfig,
  BacktestResult,
  EquityPoint,
} from '@/types/trading';
import type { BaseStrategy, StrategySignal } from './strategies/base-strategy';
import {
  type ActivePosition,
  type PositionState,
  openTrade,
  checkPositionClose,
  closeTrade,
  calculateEquity,
} from './backtest-position.ts';
import {
  type BacktestMetrics,
  buildSummary,
  buildDrawdownCurve,
  buildMonthlyReturns,
} from './backtest-stats.ts';

interface BacktestState extends PositionState {
  initialCapital: number;
  equityCurve: EquityPoint[];
  peakEquity: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
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

  const warmupPeriod = 50;
  if (candles.length <= warmupPeriod) {
    return emptyResult(config);
  }

  let pendingSignal: StrategySignal | null = null;
  for (let i = warmupPeriod; i < candles.length; i++) {
    const currentCandle = candles[i];
    if (!currentCandle) continue;

    const candleSlice = candles.slice(0, i + 1);

    // A signal calculated from a completed candle becomes executable only on
    // the following opening, whose price was not known when it was calculated.
    if (!state.position && pendingSignal) {
      openTrade(state, pendingSignal, { ...currentCandle, close: currentCandle.open }, config);
    }
    pendingSignal = null;

    if (state.position) {
      const closeResult = checkPositionClose(state.position, currentCandle, config);
      if (closeResult) {
        closeTrade(state, closeResult.exitPrice, closeResult.reason, currentCandle, config);
      }
    }

    if (!state.position && i + 1 < candles.length) {
      try {
        const signal = await strategy.analyze(candleSlice, {});
        if (signal.action !== 'hold' && signal.confidence >= 0.4) {
          pendingSignal = signal;
        }
      } catch {
        // Skip candle
      }
    }

    const equity = calculateEquity(state, currentCandle);
    state.equityCurve.push({ timestamp: currentCandle.timestamp, value: equity });

    if (equity > state.peakEquity) {
      state.peakEquity = equity;
    }
    const drawdown = state.peakEquity - equity;
    const drawdownPct = state.peakEquity > 0 ? (drawdown / state.peakEquity) * 100 : 0;
    state.maxDrawdown = Math.max(state.maxDrawdown, drawdown);
    state.maxDrawdownPct = Math.max(state.maxDrawdownPct, drawdownPct);
  }

  if (state.position && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      closeTrade(state, lastCandle.close, 'timeout', lastCandle, config);
      // The final chart point must include forced-close fees and slippage.
      state.equityCurve[state.equityCurve.length - 1] = { timestamp: lastCandle.timestamp, value: state.capital };
      state.peakEquity = Math.max(state.peakEquity, state.capital);
      state.maxDrawdown = Math.max(state.maxDrawdown, state.peakEquity - state.capital);
      state.maxDrawdownPct = Math.max(state.maxDrawdownPct, (state.peakEquity - state.capital) / state.peakEquity * 100);
    }
  }

  const metrics: BacktestMetrics = {
    peakEquity: state.peakEquity,
    maxDrawdown: state.maxDrawdown,
    maxDrawdownPct: state.maxDrawdownPct,
    initialCapital: state.initialCapital,
    maxConsecutiveWins: state.maxConsecutiveWins,
    maxConsecutiveLosses: state.maxConsecutiveLosses,
    totalFees: state.totalFees,
  };

  return {
    config,
    summary: buildSummary(state.trades, metrics),
    trades: state.trades,
    equity_curve: state.equityCurve,
    drawdown_curve: buildDrawdownCurve(state.equityCurve),
    monthly_returns: buildMonthlyReturns(state.trades, state.initialCapital),
  };
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

export type { ActivePosition };
