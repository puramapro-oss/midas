import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary } from './backtest-stats.ts';
import type { BacktestTrade } from '@/types/trading';

const day = 86400000;
const metrics = { initialCapital: 100, peakEquity: 110, maxDrawdown: 11, maxDrawdownPct: 10,
  maxConsecutiveWins: 1, maxConsecutiveLosses: 1, totalFees: 0 };
const curve = (step = day) => [100, 110, 99, 108.9].map((value, i) => ({ value, timestamp: i * step }));
const near = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('Sharpe and Sortino use equal-duration portfolio returns, including all downside observations', () => {
  const summary = buildSummary([], metrics, curve(), day);
  near(summary.sharpe_ratio, Math.sqrt(365) / Math.sqrt(12));
  near(summary.sortino_ratio, Math.sqrt(365) / Math.sqrt(3));
  assert.equal(summary.metric_basis.sample_count, 3);
  assert.equal(summary.metric_basis.risk_free_rate_annual, 0);
  assert.ok(summary.metric_warnings.includes('short_history_less_than_30_days'));
});

test('Calmar uses geometric annual return over the actual duration', () => {
  const step = 2 * 365 * day / 3;
  const summary = buildSummary([], metrics, curve(step), step);
  near(summary.annualized_return_pct, (Math.sqrt(1.089) - 1) * 100);
  near(summary.calmar_ratio, (Math.sqrt(1.089) - 1) / 0.1);
});

test('undefined ratios remain null instead of fabricated zero or 999', () => {
  const trades = [{ pnl: 10, pnl_pct: 10, entry_date: '2026-01-01', exit_date: '2026-01-02' }] as BacktestTrade[];
  const summary = buildSummary(trades, { ...metrics, maxDrawdown: 0, maxDrawdownPct: 0 },
    [100, 100, 100].map((value, i) => ({ value, timestamp: i * day })), day);
  for (const key of ['sharpe_ratio', 'sortino_ratio', 'profit_factor', 'calmar_ratio', 'recovery_factor'] as const) assert.equal(summary[key], null, key);
  assert.ok(!JSON.stringify(summary).includes('999'));
});

test('flat trades are not losses, and profit factor divides total gains by total losses', () => {
  const trades = [10, 20, -5, 0].map(pnl => ({ pnl, pnl_pct: pnl, entry_date: '2026-01-01', exit_date: '2026-01-02' })) as BacktestTrade[];
  const summary = buildSummary(trades, metrics, curve(), day);
  assert.equal(summary.profit_factor, 6);
  assert.equal(summary.losing_trades, 1);
  assert.equal(summary.breakeven_trades, 1);
});

test('irregular, insolvent or invalid equity cannot produce risk-adjusted ratios', () => {
  for (const data of [[...curve().slice(0, 2), { timestamp: 3 * day, value: 99 }],
    [{ timestamp: 0, value: 100 }, { timestamp: day, value: 0 }, { timestamp: 2 * day, value: 100 }],
    [{ timestamp: 0, value: 100 }, { timestamp: day, value: NaN }]]) {
    const summary = buildSummary([], metrics, data, day);
    assert.equal(summary.sharpe_ratio, null);
    assert.equal(summary.sortino_ratio, null);
    assert.equal(summary.calmar_ratio, null);
    assert.ok(summary.metric_warnings.includes('invalid_or_irregular_equity'));
  }
});
