import test from 'node:test';
import assert from 'node:assert/strict';
import { openTrade, closeTrade, calculateEquity, checkPositionClose, type PositionState } from './backtest-position.ts';
import type { BacktestConfig, Candle } from '@/types/trading';
import type { StrategySignal } from './strategies/base-strategy';

const config = { fee_rate: 0.001, slippage_pct: 0, trailing_stop: false, trailing_stop_pct: 1 } as BacktestConfig;
const candle: Candle = { timestamp: 1700000000000, open: 100, high: 101, low: 99, close: 100, volume: 100 };
const signal: StrategySignal = { action: 'buy', confidence: 0.8, entry_price: 100, stop_loss: 95, take_profit: 110, reasoning: 'test' };
const fresh = (): PositionState => ({ capital: 10000, position: null, trades: [], totalFees: 0,
  consecutiveWins: 0, consecutiveLosses: 0, maxConsecutiveWins: 0, maxConsecutiveLosses: 0 });
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('a flat round trip loses exactly both fees and never manufactures principal', () => {
  for (const side of ['buy', 'sell'] as const) {
    const state = fresh();
    openTrade(state, { ...signal, action: side, stop_loss: side === 'buy' ? 95 : 105, take_profit: side === 'buy' ? 110 : 90 }, candle, config);
    near(calculateEquity(state, candle), 9996);
    closeTrade(state, 100, 'timeout', candle, config);
    near(state.capital, 9992);
    near(state.trades[0].pnl, -8);
    near(state.trades[0].fees, 8);
    near(state.trades[0].pnl_pct, -0.2);
    near(state.capital - 10000, state.trades[0].pnl);
  }
});
test('capital, accumulated fees and realized P&L reconcile across repeated wins and losses', () => {
  const state = fresh();
  for (const exit of [110, 95, 103, 100, 97]) {
    openTrade(state, signal, candle, config);
    closeTrade(state, exit, 'timeout', candle, config);
  }
  near(state.capital, 10000 + state.trades.reduce((sum, t) => sum + t.pnl, 0));
  near(state.totalFees, state.trades.reduce((sum, t) => sum + t.fees, 0));
});
test('invalid or duplicate openings cannot mutate backtest capital', () => {
  for (const invalid of [{ ...signal, action: 'hold' as const }, { ...signal, stop_loss: NaN }, { ...signal, take_profit: 80 }]) {
    const state = fresh(); openTrade(state, invalid, candle, config);
    assert.equal(state.position, null); assert.equal(state.capital, 10000);
  }
  const state = fresh(); openTrade(state, signal, candle, config);
  const before = structuredClone(state); openTrade(state, signal, candle, config);
  assert.deepEqual(state, before);
});
test('a gap through a stop uses the adverse opening price', () => {
  const state = fresh(); openTrade(state, signal, candle, config);
  assert.equal(checkPositionClose(state.position!, { ...candle, open: 85, low: 80, high: 90, close: 88 }, config)?.exitPrice, 85);
  const short = fresh();
  openTrade(short, { ...signal, action: 'sell', stop_loss: 105, take_profit: 90 }, candle, config);
  assert.equal(checkPositionClose(short.position!, { ...candle, open: 115, high: 120, low: 110, close: 118 }, config)?.exitPrice, 115);
});

test('trailing stops use previously observed extremes, then honor an adverse opening gap', () => {
  const trailing = { ...config, trailing_stop: true };
  const long = fresh(); openTrade(long, { ...signal, take_profit: 200 }, candle, trailing);
  assert.equal(checkPositionClose(long.position!, { ...candle, open: 106, high: 120, low: 105, close: 116 }, trailing), null);
  assert.equal(checkPositionClose(long.position!, { ...candle, open: 115, high: 118, low: 114, close: 115 }, trailing)?.exitPrice, 115);
  const short = fresh();
  openTrade(short, { ...signal, action: 'sell', stop_loss: 105, take_profit: 50 }, candle, trailing);
  assert.equal(checkPositionClose(short.position!, { ...candle, open: 94, high: 95, low: 80, close: 85 }, trailing), null);
  assert.equal(checkPositionClose(short.position!, { ...candle, open: 85, high: 88, low: 82, close: 86 }, trailing)?.exitPrice, 85);
});

test('an invalid date cannot debit fees before an opening or closing fails', () => {
  const state = fresh();
  openTrade(state, signal, { ...candle, timestamp: 1e100 }, config);
  assert.deepEqual(state, fresh());
  openTrade(state, signal, candle, config);
  const before = structuredClone(state);
  assert.throws(() => closeTrade(state, 100, 'timeout', { ...candle, timestamp: 1e100 }, config), /date/);
  assert.deepEqual(state, before);
});

test('selected stop and target percentages apply to the executed entry price', () => {
  const state = fresh();
  openTrade(state, signal, candle, { ...config, stop_loss_pct: 3, take_profit_pct: 6 });
  near(state.position!.stopLoss, 97); near(state.position!.takeProfit, 106);
});

test('the default 2% stop sizes within capital including entry fees instead of rejecting every entry', () => {
  const state = fresh();
  openTrade(state, signal, candle, { ...config, stop_loss_pct: 2, take_profit_pct: 5 });
  assert.ok(state.position);
  const notional = state.position.entryPrice * state.position.quantity;
  assert.ok(notional + state.position.entryFee <= 10000 + 1e-8);
  closeTrade(state, 100, 'timeout', candle, config);
  near(state.capital, 10000 - state.totalFees);
});

test('the tighter known trailing stop takes precedence over the original stop in both directions', () => {
  const trailing = { ...config, trailing_stop: true, trailing_stop_pct: 10 };
  const long = fresh(); openTrade(long, { ...signal, take_profit: 200 }, candle, trailing);
  long.position!.trailingStopHighest = 120;
  assert.deepEqual(checkPositionClose(long.position!, { ...candle, open: 110, high: 111, low: 90, close: 100 }, trailing),
    { exitPrice: 108, reason: 'trailing_stop' });
  const short = fresh(); openTrade(short, { ...signal, action: 'sell', stop_loss: 105, take_profit: 50 }, candle, trailing);
  short.position!.trailingStopLowest = 80;
  const close = checkPositionClose(short.position!, { ...candle, open: 85, low: 80, high: 110, close: 100 }, trailing);
  near(close!.exitPrice, 88); assert.equal(close!.reason, 'trailing_stop');
});

test('a target already crossed at the opening precedes an opposite intrabar stop', () => {
  const long = fresh(); openTrade(long, signal, candle, config);
  assert.deepEqual(checkPositionClose(long.position!, { ...candle, open: 115, high: 120, low: 90 }, config),
    { exitPrice: 110, reason: 'take_profit' });
});
