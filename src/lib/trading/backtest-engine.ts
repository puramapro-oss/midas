// =============================================================================
// MIDAS — Backtest Engine
// Simulate trading strategies on historical candle data
// =============================================================================

import type { Candle } from '@/types/trading';
import { CANDLE_INTERVAL_MS, type CandleInterval } from '../exchange/candle-contract.ts';
import { backtestWarmup } from './backtest-contract.ts';
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
  const step = CANDLE_INTERVAL_MS[config.timeframe as CandleInterval];
  if (!step || !Number.isFinite(config.initial_capital) || config.initial_capital <= 0 ||
      !Number.isFinite(config.fee_rate) || config.fee_rate < 0 || config.fee_rate >= 1 ||
      !Number.isFinite(config.slippage_pct) || config.slippage_pct < 0 || config.slippage_pct >= 100 ||
      (config.leverage !== undefined && config.leverage !== 1) ||
      (config.max_concurrent_positions !== undefined && config.max_concurrent_positions !== 1) || config.use_ai_signals) {
    throw new Error('Invalid or unsupported backtest configuration');
  }
  if (candles.some((c, i) => !Number.isSafeInteger(c.timestamp) || !Number.isFinite(new Date(c.timestamp + step).getTime()) ||
      ![c.open, c.high, c.low, c.close].every(v => Number.isFinite(v) && v > 0) ||
      !Number.isFinite(c.volume) || c.volume < 0 || c.high < Math.max(c.open, c.close, c.low) ||
      c.low > Math.min(c.open, c.close, c.high) || (i > 0 && c.timestamp - candles[i - 1].timestamp !== step))) {
    throw new Error('Invalid or incomplete backtest candles');
  }
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

  const warmupPeriod = backtestWarmup(config.strategy);
  if (candles.length <= warmupPeriod) {
    return emptyResult(config);
  }

  // Equity observations are at candle CLOSE, with a starting value at the first open.
  for (const candle of candles.slice(0, warmupPeriod)) state.equityCurve.push({ timestamp: candle.timestamp + step, value: state.capital });
  let pendingSignal: StrategySignal | null = null;
  let lastDcaIndex: number | undefined;
  for (let i = warmupPeriod; i < candles.length; i++) {
    const currentCandle = candles[i];
    if (!currentCandle) continue;

    const candleSlice = candles.slice(0, i + 1);

    // A signal calculated from a completed candle becomes executable only on
    // the following opening, whose price was not known when it was calculated.
    if (!state.position && pendingSignal) {
      openTrade(state, pendingSignal, { ...currentCandle, close: currentCandle.open }, config);
      if (state.position && config.strategy === 'dca') lastDcaIndex = i;
    }
    pendingSignal = null;

    if (state.position) {
      const closeResult = checkPositionClose(state.position, currentCandle, config);
      if (closeResult) {
        closeTrade(state, closeResult.exitPrice, closeResult.reason, { ...currentCandle, timestamp: currentCandle.timestamp + step }, config);
      }
    }

    if (!state.position && i + 1 < candles.length) {
      try {
        const signal = await strategy.analyze(candleSlice, { last_dca_candle_index: lastDcaIndex });
        if (signal.action !== 'hold' && signal.confidence >= 0.4) {
          pendingSignal = signal;
        }
      } catch {
        throw new Error('Strategy analysis failed; incomplete backtest discarded');
      }
    }

    const equity = calculateEquity(state, currentCandle);
    state.equityCurve.push({ timestamp: currentCandle.timestamp + step, value: equity });

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
      closeTrade(state, lastCandle.close, 'timeout', { ...lastCandle, timestamp: lastCandle.timestamp + step }, config);
      // The final chart point must include forced-close fees and slippage.
      state.equityCurve[state.equityCurve.length - 1] = { timestamp: lastCandle.timestamp + step, value: state.capital };
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
    summary: buildSummary(state.trades, metrics, state.equityCurve, step),
    trades: state.trades,
    equity_curve: state.equityCurve,
    drawdown_curve: buildDrawdownCurve(state.equityCurve),
    monthly_returns: buildMonthlyReturns(state.trades, state.initialCapital),
  };
}

function emptyResult(config: BacktestConfig): BacktestResult {
  return {
    config,
    summary: buildSummary([], { initialCapital: config.initial_capital, peakEquity: config.initial_capital,
      maxDrawdown: 0, maxDrawdownPct: 0, maxConsecutiveWins: 0, maxConsecutiveLosses: 0, totalFees: 0 },
      [], CANDLE_INTERVAL_MS[config.timeframe as CandleInterval]),
    trades: [],
    equity_curve: [],
    drawdown_curve: [],
    monthly_returns: [],
  };
}

export type { ActivePosition };
