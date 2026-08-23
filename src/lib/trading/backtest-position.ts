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
  const entryPrice = candle.close * (1 + config.slippage_pct / 100 * (signal.action === 'buy' ? 1 : -1));
  const riskPerTrade = state.capital * 0.02;
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

export function checkPositionClose(
  position: ActivePosition,
  candle: Candle,
  config: BacktestConfig
): { exitPrice: number; reason: BacktestTrade['exit_reason'] } | null {
  if (position.side === 'buy') {
    if (candle.low <= position.stopLoss) {
      return { exitPrice: position.stopLoss, reason: 'stop_loss' };
    }
    if (candle.high >= position.takeProfit) {
      return { exitPrice: position.takeProfit, reason: 'take_profit' };
    }
    if (config.trailing_stop && config.trailing_stop_pct > 0) {
      const newHigh = Math.max(position.trailingStopHighest, candle.high);
      position.trailingStopHighest = newHigh;
      const trailLevel = newHigh * (1 - config.trailing_stop_pct / 100);
      if (candle.low <= trailLevel && trailLevel > position.entryPrice) {
        return { exitPrice: trailLevel, reason: 'trailing_stop' };
      }
    }
  } else {
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
  const fee = pos.quantity * slippageAdjusted * config.fee_rate;

  const rawPnl =
    pos.side === 'buy'
      ? (slippageAdjusted - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - slippageAdjusted) * pos.quantity;

  const netPnl = rawPnl - fee;
  const pnlPct = pos.entryPrice > 0 ? (rawPnl / (pos.entryPrice * pos.quantity)) * 100 : 0;

  state.capital += netPnl + pos.quantity * pos.entryPrice;
  state.totalFees += fee;

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
