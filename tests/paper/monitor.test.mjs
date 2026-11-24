import test, { mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = new URL('../../src/', import.meta.url);
registerHooks({ resolve(specifier, context, nextResolve) {
  let url;
  if (specifier.startsWith('@/')) url = new URL(specifier.slice(2), source);
  else if (specifier.startsWith('.') && context.parentURL?.startsWith(source.href)) url = new URL(specifier, context.parentURL);
  if (url && !url.pathname.endsWith('.ts') && existsSync(fileURLToPath(url) + '.ts')) url = new URL(url.href + '.ts');
  return nextResolve(url?.href ?? specifier, context);
} });
const id = 'abcdefab-cdef-4abc-8def-abcdefabcdef';
let globalCount; let positions; let quote; let quoteReads; let writes; let dbError; let loseResponse; let saved; let badReceipt;
const db = { from(table) {
  assert.equal(table, 'trades'); const filters = {};
  const query = { select: () => query, eq: (key, value) => { filters[key] = value; return query; },
    order: () => query, abortSignal: () => query,
    limit: async () => {
      if (!filters.user_id) {
        assert.deepEqual(filters, { status: 'open', is_paper_trade: true });
        return { data: positions, error: null, count: globalCount };
      }
      assert.deepEqual(filters, { user_id: 'account-a', status: 'open', is_paper_trade: true });
      return { data: positions, error: null };
    } };
  return query;
}, rpc(name, args) { return { abortSignal: async () => {
  writes++; assert.equal(name, 'midas_apply_paper_observation');
  assert.equal(args.p_user_id, 'account-a'); assert.equal(args.p_price, 100);
  if (dbError) return { data: null, error: { message: 'failed' } };
  const replayed = Boolean(saved);
  saved ??= { id: args.p_trade_id, user_id: 'account-a', is_paper_trade: true, status: 'closed', exit_price: 100, fees: 0.2 };
  if (loseResponse) { loseResponse = false; throw new Error('lost after commit'); }
  return { data: { trade: badReceipt ? { ...saved, user_id: 'other' } : saved, replayed,
    actions: replayed ? [] : [{ position_id: args.p_trade_id, action: 'close_sl', reason: 'stop_loss', new_stop_loss: null, close_price: 100 }] }, error: null };
} }; } };
mock.module(new URL('lib/supabase/server.ts', source).href, { namedExports: { createServiceClient: () => db } });
mock.module(new URL('lib/exchange/binance-public.ts', source).href, { namedExports: { fetchPaperQuote: async () => { quoteReads++; return quote; } } });
const { monitorPositions, monitorAllPaperPositions } = await import(new URL('lib/trading/trade-monitor.ts', source).href);
const { applyPaperObservation } = await import(new URL('lib/trading/paper-position.ts', source).href);
beforeEach(() => {
  positions = [{ id, user_id: 'account-a', pair: 'BTC/USDT', is_paper_trade: true, current_price: 999999 }];
  quote = { price: 100, observed_at: Date.now(), source: 'binance_aggTrades' };
  globalCount = 1; quoteReads = 0; writes = 0; dbError = false; loseResponse = false; saved = null; badReceipt = false;
});

test('the actual monitor uses fresh market data instead of the stored price', async () => {
  const result = await monitorPositions('account-a');
  assert.equal(quoteReads, 1); assert.equal(writes, 1);
  assert.equal(result.actions_taken[0].close_price, 100);
  assert.deepEqual(result.errors, []);
});
test('missing or stale observations never write or announce successful actions', async () => {
  for (const value of [null, { ...quote, observed_at: Date.now() - 180000 }]) {
    quote = value;
    const result = await monitorPositions('account-a');
    assert.equal(result.actions_taken.length, 0); assert.equal(result.errors.length, 1);
  }
  assert.equal(writes, 0);
});
test('a persistence error is reported and never counted as an action taken', async () => {
  dbError = true;
  const result = await monitorPositions('account-a');
  assert.equal(result.actions_taken.length, 0); assert.equal(result.errors.length, 1);
});
test('the paper observation wrapper recovers a close committed before connection loss', async () => {
  loseResponse = true;
  await assert.rejects(applyPaperObservation('account-a', id, quote, true), /lost after commit/);
  const result = await applyPaperObservation('account-a', id, quote, true);
  assert.equal(result.replayed, true); assert.equal(result.trade.status, 'closed');
  assert.equal(result.trade.fees, 0.2);
});
test('a cross-account receipt or position is rejected', async () => {
  badReceipt = true;
  await assert.rejects(applyPaperObservation('account-a', id, quote), /Invalid paper observation receipt/);
  writes = 0; positions[0].user_id = 'other';
  const result = await monitorPositions('account-a');
  assert.equal(result.actions_taken.length, 0); assert.equal(writes, 0);
});

test('the scheduled monitoring path uses the same atomic close and reports persistence failures', async () => {
  const result = await monitorAllPaperPositions();
  assert.equal(result.actions_taken.length, 1); assert.equal(writes, 1);
  dbError = true;
  const failed = await monitorAllPaperPositions();
  assert.equal(failed.actions_taken.length, 0); assert.equal(failed.errors.length, 1);
});

test('the scheduled monitoring path rejects truncated inventories and live rows', async () => {
  globalCount = 2;
  let result = await monitorAllPaperPositions();
  assert.equal(result.positions_checked, 0); assert.equal(result.errors.length, 1);
  globalCount = 1; positions[0].is_paper_trade = false;
  result = await monitorAllPaperPositions();
  assert.equal(result.actions_taken.length, 0); assert.equal(result.errors.length, 1); assert.equal(writes, 0);
});
