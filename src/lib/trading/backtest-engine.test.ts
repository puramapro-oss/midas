import test from 'node:test';
import assert from 'node:assert/strict';
import { runBacktest } from './backtest-engine.ts';
import { buildMonthlyReturns } from './backtest-stats.ts';
import type { BaseStrategy } from './strategies/base-strategy';
import type { BacktestConfig, BacktestTrade } from '@/types/trading';

const config = { initial_capital: 10000, fee_rate: 0.001, slippage_pct: 0, trailing_stop: false } as BacktestConfig;
const strategy = { analyze: async () => ({ action: 'buy', confidence: 0.8, entry_price: 100, stop_loss: 95, take_profit: 120, reasoning: 'test' }) } as unknown as BaseStrategy;

test('a completed-candle signal fills at the next open and final equity includes both fees', async () => {
  const candles = Array.from({ length: 52 }, (_, i) => ({ timestamp: 1700000000000 + i * 3600000,
    open: i === 51 ? 105 : 100, high: i === 51 ? 107 : 101, low: i === 51 ? 104 : 99,
    close: i === 51 ? 106 : 100, volume: 100 }));
  const result = await runBacktest(config, candles, strategy);
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].entry_price, 105);
  assert.equal(result.trades[0].entry_date, new Date(candles[51].timestamp).toISOString());
  assert.ok(Math.abs(result.equity_curve.at(-1)!.value - (10000 + result.summary.total_pnl)) < 1e-8);
  assert.ok(Math.abs(result.summary.total_fees - result.trades[0].fees) < 1e-8);
});
test('a signal on the last available candle cannot be filled retrospectively', async () => {
  const candles = Array.from({ length: 51 }, (_, i) => ({ timestamp: 1700000000000 + i * 3600000,
    open: 100, high: 101, low: 99, close: 100, volume: 100 }));
  assert.equal((await runBacktest(config, candles, strategy)).trades.length, 0);
});
test('monthly realized returns use opening capital including prior net results', () => {
  const trades = [{ exit_date: '2026-01-30', pnl: 100 }, { exit_date: '2026-02-20', pnl: -110 }] as BacktestTrade[];
  const returns = buildMonthlyReturns(trades, 1000);
  assert.equal(returns[0].pnl_pct, 10);
  assert.equal(returns[1].pnl_pct, -10);
});
