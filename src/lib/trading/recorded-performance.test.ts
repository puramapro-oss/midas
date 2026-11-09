import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readPaperTrades, summarizeRecordedTrades, escapeTradeCsv } from './recorded-performance.ts';
import type { RecordedTrade } from './recorded-performance.ts';

const now = Date.parse('2026-10-11T12:00:00Z');
const day = 86400000;
function trade(id: string, gross: number, fees: number, daysAgo = 0): RecordedTrade {
  return { id, user_id: 'owner', is_paper_trade: true, pair: 'BTC/USDT', side: 'buy', strategy: 'momentum',
    status: 'closed', quantity: 1, entry_price: 100, exit_price: 100 + gross, pnl: gross, fees,
    stop_loss: 95, take_profit: 110, exchange: 'paper', created_at: new Date(now - 40 * day).toISOString(),
    updated_at: new Date(now - daysAgo * day).toISOString(), closed_at: new Date(now - daysAgo * day).toISOString() };
}

test('recorded performance uses net fees, true rolling periods and total gain/loss profit factor', () => {
  const stats = summarizeRecordedTrades([
    trade('today', 22, 2), trade('old', 12, 2, 40), trade('loss', -4, 1, 3), trade('flat', 1, 1, 10),
  ], now);
  assert.equal(stats.totalPnl, 25); assert.equal(stats.totalFees, 6); assert.equal(stats.grossPnl, 31);
  assert.equal(stats.profitFactor, 6); // 30/5, not average win/average loss = 3.
  assert.equal(stats.winningTrades, 2); assert.equal(stats.losingTrades, 1); assert.equal(stats.breakevenTrades, 1);
  assert.equal(stats.winRate, 50); assert.equal(stats.maxDrawdown, 5);
  assert.deepEqual(stats.periodPnl, { day: 20, week: 15, month: 15 });
  assert.equal(stats.recentTrades[0].id, 'today');
});

test('undefined ratios stay null, simultaneous settlements do not invent an order, and invalid history fails', () => {
  assert.equal(summarizeRecordedTrades([], now).profitFactor, null);
  assert.equal(summarizeRecordedTrades([trade('gain', 2, 1)], now).profitFactor, null);
  assert.equal(summarizeRecordedTrades([trade('b', -5, 0), trade('a', 10, 0)], now).maxDrawdown, 0);
  for (const t of [
    { ...trade('x', 2, 1), pnl: null }, { ...trade('x', 2, 1), fees: -1 },
    { ...trade('x', 2, 1), closed_at: null }, trade('x', 2, 1, -1),
    { ...trade('x', 2, 1), pair: 'ETH/EUR' },
  ]) assert.throws(() => summarizeRecordedTrades([t], now));
});

type Page = { data: RecordedTrade[] | null; error: { message: string } | null; count: number | null };
function client(pages: Page[], calls: unknown[][] = []) {
  let index = 0;
  const query = {
    select(columns: string, opts: unknown) {
      assert(!columns.split(', ').some(c => c === 'fee' || c === 'amount'));
      assert(columns.includes('fees')); calls.push(['select', opts]); return query;
    },
    eq(key: string, value: unknown) { calls.push(['eq', key, value]); return query; },
    lte(key: string, value: unknown) { calls.push(['lte', key, value]); return query; },
    order(key: string, value: unknown) { calls.push(['order', key, value]); return query; },
    range(start: number, end: number) { calls.push(['range', start, end]); return query; },
    abortSignal() { return Promise.resolve(pages[index++]); },
  };
  return { from(table: string) { assert.equal(table, 'trades'); return query; } } as unknown as SupabaseClient;
}

test('paper history paginates past a provider row cap without omitting fees or mixing accounts/modes', async () => {
  const rows = [trade('a', 2, 1), trade('b', 2, 1), trade('c', 2, 1)];
  const calls: unknown[][] = [];
  const db = client([
    { data: rows.slice(0, 2), count: 3, error: null }, { data: rows.slice(2), count: 3, error: null },
  ], calls);
  assert.equal((await readPaperTrades(db, 'owner', now)).length, 3);
  assert(calls.some(c => c[0] === 'range' && c[1] === 2));
  assert.equal(calls.filter(c => c[0] === 'eq' && c[1] === 'user_id' && c[2] === 'owner').length, 2);
  assert.equal(calls.filter(c => c[0] === 'eq' && c[1] === 'is_paper_trade' && c[2] === true).length, 2);
});

test('failed, partial, duplicate, oversized or changing history never becomes a successful empty report', async () => {
  const a = trade('a', 1, 0);
  const page = (data: RecordedTrade[], count = data.length): Page => ({ data, count, error: null });
  for (const pages of [
    [{ data: null, error: { message: 'network' }, count: null }],
    [page([a], 2), page([], 2)], [page([a, a])], [page([], 10001)],
    [page([a], 2), page([trade('b', 1, 0)], 3)],
    [page([{ ...a, user_id: 'other' }])], [page([{ ...a, is_paper_trade: false }])],
    [page([{ ...a, updated_at: new Date(now + 1).toISOString() }])],
  ]) await assert.rejects(readPaperTrades(client(pages), 'owner', now));
  assert.deepEqual(await readPaperTrades(client([page([])]), 'owner', now), []);
});

test('CSV text cannot become a formula and quotes/newlines remain a single cell', () => {
  assert.equal(escapeTradeCsv('=HYPERLINK("https://example.test")'), '"\'=HYPERLINK(""https://example.test"")"');
  assert.equal(escapeTradeCsv('\t+1'), '"\'\t+1"');
  assert.equal(escapeTradeCsv(-5), '"-5"');
  assert.equal(escapeTradeCsv('a,"b"\nc'), '"a,""b""\nc"');
});
