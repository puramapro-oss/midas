import test, { mock } from 'node:test';
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

let stale = false;
let historyError = false;
let reads = 0;
const db = { from(table) {
  reads++;
  assert.notEqual(table, 'exchange_connections', 'Paper simulation must not require exchange credentials');
  const filters = {};
  const result = () => {
    if (table === 'profiles') return { data: { id: 'a', plan: 'free' }, error: null };
    if (table === 'trading_settings') return { data: { paper_capital: 10000, capital_usd: 1000 }, error: null };
    assert.equal(filters.user_id, 'a');
    assert.equal(filters.is_paper_trade, true);
    return { data: [], error: historyError ? { message: 'unavailable' } : null };
  };
  const query = {
    select: () => query, eq: (key, value) => { filters[key] = value; return query; },
    gte: () => query, order: () => query, limit: () => query,
    single: async () => result(), maybeSingle: async () => result(),
    then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
  };
  return query;
} };
mock.module(new URL('lib/supabase/server.ts', source).href, { namedExports: { createServiceClient: () => db } });
mock.module(new URL('lib/exchange/binance-public.ts', source).href, { namedExports: { fetchKlines: async () => {
  const now = Date.now() - (stale ? 3600000 : 0);
  return Array.from({ length: 61 }, (_, i) => ({ timestamp: now - (60 - i) * 60000, close: 100 }));
} } });
const { simulate } = await import(new URL('lib/trading/pre-trade-simulation.ts', source).href);
const decision = { action: 'buy', pair: 'BTC/USDT', entry_price: 100, stop_loss: 95, take_profit: 110,
  position_size_pct: 1, confidence: 0.8, composite_score: 0, risk_reward_ratio: 2, strategy: 'manual',
  reasoning: 'Test', agent_results: [], approved_by_shield: false };

test('actual simulation uses paper capital and works without an exchange account', async () => {
  stale = false; historyError = false;
  assert.equal((await simulate(decision, 'a', 100)).passed, true);
});
test('an oversized quote override cannot bypass the original percentage risk check', async () => {
  stale = false; historyError = false;
  const result = await simulate(decision, 'a', 5000);
  assert.equal(result.passed, false);
  assert.ok(result.reasons.some(reason => reason.includes('Position Sizing')));
});
test('stale crash data blocks the actual pre-execution path', async () => {
  stale = true; historyError = false;
  assert.equal((await simulate(decision, 'a', 100)).passed, false);
});
test('a database failure cannot masquerade as an empty safe account', async () => {
  stale = false; historyError = true;
  const result = await simulate(decision, 'a', 100);
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes('Paper risk history unavailable'));
});
test('invalid numeric decisions are rejected before any database reads', async () => {
  reads = 0;
  assert.equal((await simulate({ ...decision, entry_price: NaN }, 'a', 100)).passed, false);
  assert.equal(reads, 0);
});
