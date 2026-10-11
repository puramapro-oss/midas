import test from 'node:test';
import assert from 'node:assert/strict';
import { readMemoryHistory, summarizeMemory } from './memory-history.ts';

function database(rows: Record<string, unknown>[]) {
  const filters: Array<(row: Record<string, unknown>) => boolean> = [];
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query; },
    gte: (key: string, value: string) => { filters.push(row => String(row[key]) >= value); return query; },
    order: () => query,
    limit: async (count: number) => ({ data: rows.filter(row => filters.every(filter => filter(row))).slice(0, count), error: null }),
  };
  return { from: () => query } as unknown as Parameters<typeof readMemoryHistory>[0];
}

test('memory excludes another account, live history, wrong strategy and old closes', async () => {
  const valid = { user_id: 'a', is_paper_trade: true, pair: 'BTC/USDT', strategy: 'x', status: 'closed', closed_at: new Date().toISOString(), pnl: 5 };
  const rows = [valid, { ...valid, user_id: 'b' }, { ...valid, is_paper_trade: false }, { ...valid, strategy: 'y' },
    { ...valid, closed_at: '2000-01-01' }, { ...valid, status: 'open' }];
  assert.deepEqual(await readMemoryHistory(database(rows), 'BTC/USDT', { userId: 'a', isPaper: true, strategy: 'x' }), [valid]);
});
test('a missing tenant or mode fails before reading service-role data', async () => {
  let reads = 0;
  const db = { from: () => { reads++; throw new Error('should not query'); } } as never;
  await assert.rejects(readMemoryHistory(db, 'BTC/USDT', { userId: '', isPaper: true }), /account/);
  await assert.rejects(readMemoryHistory(db, 'BTC/USDT', { userId: 'a' } as never), /explicit/);
  assert.equal(reads, 0);
});
test('invalid P&L is excluded and break-even trades are counted in win-rate', () => {
  const summary = summarizeMemory([10, -5, 0, null, 'invalid'].map(pnl => ({ pnl, closed_at: '' })));
  assert.equal(summary.trades_analyzed, 3);
  assert.equal(summary.win_rate, 1 / 3);
  assert.equal(summary.excluded_rows, 2);
  assert.equal(summary.total_pnl, 5);
});
