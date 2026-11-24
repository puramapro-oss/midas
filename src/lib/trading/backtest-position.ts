// =============================================================================
// MIDAS — Backtest Position Management
// Position opening, closing, and stop-loss checks
// =============================================================================

import type { Candle, BacktestConfig, BacktestTrade } from '@/types/trading';
import type { StrategySignal } from './strategies/base-strategy';

export interface ActivePosition {
  side: 'buy' | 'sell';
  entryPrice: number;
  quantity: number;
  entryFee: number;
  stopLoss: number;
  takeProfit: number;
  trailingStopHighest: number;
  trailingStopLowest: number;
  entryDate: string;
  confidence: number;
}

export interface PositionState {
  capital: number;
  position: ActivePosition | null;
  trades: BacktestTrade[];
  totalFees: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

export function openTrade(
  state: PositionState,
  signal: StrategySignal,
  candle: Candle,
  config: BacktestConfig
): void {
  if (state.position || (signal.action !== 'buy' && signal.action !== 'sell') ||
      !Number.isFinite(state.capital) || state.capital <= 0 ||
      !Number.isFinite(config.fee_rate) || config.fee_rate < 0 || config.fee_rate >= 1 ||
      !Number.isFinite(config.slippage_pct) || config.slippage_pct < 0 || config.slippage_pct >= 100 ||
      !Number.isFinite(candle.timestamp) || !Number.isFinite(new Date(candle.timestamp).getTime()) ||
      !Number.isFinite(candle.close) || candle.close <= 0 ||
      !Number.isFinite(signal.stop_loss) || signal.stop_loss <= 0 ||
      !Number.isFinite(signal.take_profit) || signal.take_profit <= 0) return;
  const entryPrice = candle.close * (1 + config.slippage_pct / 100 * (signal.action === 'buy' ? 1 : -1));
  const direction = signal.action === 'buy' ? 1 : -1;
  const stopLoss = config.stop_loss_pct === undefined ? signal.stop_loss : entryPrice * (1 - direction * config.stop_loss_pct / 100);
  const takeProfit = config.take_profit_pct === undefined ? signal.take_profit : entryPrice * (1 + direction * config.take_profit_pct / 100);
  if (![stopLoss, takeProfit].every(value => Number.isFinite(value) && value > 0)) return;
  if (signal.action === 'buy'
    ? !(stopLoss < entryPrice && takeProfit > entryPrice)
    : !(stopLoss > entryPrice && takeProfit < entryPrice)) return;
  const riskPerTrade = state.capital * 0.02;
  const priceDiff = Math.abs(entryPrice - stopLoss);

  if (priceDiff === 0) return;

  const quantity = Math.min(riskPerTrade / priceDiff, state.capital / (entryPrice * (1 + config.fee_rate)));
  const fee = quantity * entryPrice * config.fee_rate;

  if (!Number.isFinite(quantity) || !Number.isFinite(fee) || quantity <= 0 || quantity * entryPrice + fee > state.capital * (1 + 1e-12)) return;

  state.capital -= fee;
  state.totalFees += fee;

  state.position = {
    side: signal.action === 'buy' ? 'buy' : 'sell',
    entryPrice,
    quantity,
    entryFee: fee,
    stopLoss,
    takeProfit,
    trailingStopHighest: entryPrice,
    trailingStopLowest: entryPrice,
    entryDate: new Date(candle.timestamp).toISOString(),
    confidence: signal.confidence,
  };
}

export function checkPositionClose(
  position: ActivePosition,
  candle: Candle,
  config: BacktestConfig
): { exitPrice: number; reason: BacktestTrade['exit_reason'] } | null {
  const trailing = config.trailing_stop && config.trailing_stop_pct > 0;
  const long = position.side === 'buy';
  const trailLevel = long
    ? position.trailingStopHighest * (1 - config.trailing_stop_pct / 100)
    : position.trailingStopLowest * (1 + config.trailing_stop_pct / 100);
  const useTrailing = trailing && (long
    ? trailLevel > Math.max(position.entryPrice, position.stopLoss)
    : trailLevel < Math.min(position.entryPrice, position.stopLoss));
  const stop = useTrailing ? trailLevel : position.stopLoss;
  const reason = useTrailing ? 'trailing_stop' : 'stop_loss';

  // Opening is observed before the intrabar range. Favorable target gaps use
  // the limit price conservatively; adverse stop gaps use the actual opening.
  if (long ? candle.open <= stop : candle.open >= stop) return { exitPrice: candle.open, reason };
  if (long ? candle.open >= position.takeProfit : candle.open <= position.takeProfit)
    return { exitPrice: position.takeProfit, reason: 'take_profit' };
  // Unknown intrabar order: stop before target. Only a previously known
  // trailing level can execute; this bar's extremes update the following bar.
  if (long ? candle.low <= stop : candle.high >= stop) return { exitPrice: stop, reason };
  if (long ? candle.high >= position.takeProfit : candle.low <= position.takeProfit)
    return { exitPrice: position.takeProfit, reason: 'take_profit' };
  if (trailing) {
    position.trailingStopHighest = Math.max(position.trailingStopHighest, candle.high);
    position.trailingStopLowest = Math.min(position.trailingStopLowest, candle.low);
  }

  return null;
}

export function closeTrade(
  state: PositionState,
  exitPrice: number,
  reason: BacktestTrade['exit_reason'],
  candle: Candle,
  config: BacktestConfig
): void {
  if (!state.position) return;

  const pos = state.position;
  const slippageAdjusted = exitPrice * (1 + config.slippage_pct / 100 * (pos.side === 'buy' ? -1 : 1));
  if (!Number.isFinite(slippageAdjusted) || slippageAdjusted <= 0 ||
      !Number.isFinite(candle.timestamp) || !Number.isFinite(new Date(candle.timestamp).getTime()) ||
      !Number.isFinite(config.fee_rate) || config.fee_rate < 0 || config.fee_rate >= 1) {
    throw new Error('Invalid backtest closing price, date or fees');
  }
  const fee = pos.quantity * slippageAdjusted * config.fee_rate;

  const rawPnl =
    pos.side === 'buy'
      ? (slippageAdjusted - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - slippageAdjusted) * pos.quantity;

  const netPnl = rawPnl - pos.entryFee - fee;
  const pnlPct = (netPnl / (pos.entryPrice * pos.quantity)) * 100;

  // Capital already includes the principal; the entry fee was debited on open.
  state.capital += rawPnl - fee;
  state.totalFees += fee;

  if (netPnl > 0) {
    state.consecutiveWins++;
    state.consecutiveLosses = 0;
    state.maxConsecutiveWins = Math.max(state.maxConsecutiveWins, state.consecutiveWins);
  } else if (netPnl < 0) {
    state.consecutiveLosses++;
    state.consecutiveWins = 0;
    state.maxConsecutiveLosses = Math.max(state.maxConsecutiveLosses, state.consecutiveLosses);
  } else {
    state.consecutiveWins = 0;
    state.consecutiveLosses = 0;
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
    fees: pos.entryFee + fee,
    signal_confidence: pos.confidence,
    exit_reason: reason,
  });

  state.position = null;
}

export function calculateEquity(
  state: { capital: number; position: ActivePosition | null },
  candle: Candle
): number {
  if (!state.position) return state.capital;

  const pos = state.position;
  const unrealizedPnl =
    pos.side === 'buy'
      ? (candle.close - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - candle.close) * pos.quantity;

  return state.capital + unrealizedPnl;
}
