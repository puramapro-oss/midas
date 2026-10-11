import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { requestBacktest } from './backtest-client.ts';

const original = globalThis.fetch;
after(() => { globalThis.fetch = original; });
const input = { pair: 'BTC/USDT', strategy: 'momentum', timeframe: '4h', capital: 10000,
  startDate: '2026-01-01', endDate: '2026-02-01', stopLossPct: 2, takeProfitPct: 5 };
const reply = () => ({ result: { config: { symbol: input.pair, strategy: input.strategy, timeframe: input.timeframe, initial_capital: input.capital,
  start_date: input.startDate, end_date: input.endDate, stop_loss_pct: input.stopLossPct, take_profit_pct: input.takeProfitPct },
  summary: { total_pnl: -8, total_pnl_pct: -0.08, total_trades: 1, win_rate: 0, max_drawdown_pct: 0.08,
    avg_holding_time_hours: 4, best_trade: -8, worst_trade: -8, total_fees: 8, sharpe_ratio: null, sortino_ratio: null, profit_factor: 0 } },
  market_data_source: 'binance', coverage: { complete: true, first_open_time: Date.parse(input.startDate), end_exclusive: Date.parse(input.endDate), candles: 186, warmup_candles: 50 } });

test('the backtest client submits the selected inputs and returns the real loss without sample substitution', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/backtest/run'); assert.equal(init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    return Response.json(reply());
  };
  const result = await requestBacktest(input);
  assert.equal(result.result.summary.total_pnl, -8);
  assert.equal(result.result.summary.sharpe_ratio, null);
});
test('provider errors and login HTML never produce sample results', async () => {
  globalThis.fetch = async () => Response.json({ error: 'Historique incomplet' }, { status: 503 });
  await assert.rejects(requestBacktest(input), /Historique incomplet/);
  globalThis.fetch = async () => new Response('<html>Login</html>');
  await assert.rejects(requestBacktest(input), /incohérente/);
});
test('a mismatched simulation, incomplete coverage or malformed number is rejected', async () => {
  const base = reply();
  for (const body of [
    { ...base, result: { ...base.result, config: { ...base.result.config, symbol: 'ETH/USDT' } } },
    { ...base, coverage: { ...base.coverage, complete: false } },
    { ...base, coverage: { ...base.coverage, first_open_time: Date.parse('2023-01-01') } },
    { ...base, coverage: { ...base.coverage, candles: 100 } },
    { ...base, result: { ...base.result, config: { ...base.result.config, stop_loss_pct: 20 } } },
    { ...base, result: { ...base.result, summary: { ...base.result.summary, total_pnl: null } } },
    { ...base, result: { ...base.result, summary: { ...base.result.summary, sharpe_ratio: '1.82' } } },
  ]) {
    globalThis.fetch = async () => Response.json(body);
    await assert.rejects(requestBacktest(input));
  }
});
