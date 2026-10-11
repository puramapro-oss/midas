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

let saved = null;
let lookupError = false;
let loseResponse = false;
let calls = 0;
let simulations = 0;
let allowed = true;
const operation = '11111111-1111-4111-8111-111111111111';
const decision = { action: 'buy', pair: 'BTC/USDT', entry_price: 100, stop_loss: 95, take_profit: 110,
  position_size_pct: 1, confidence: 0.8, composite_score: 0, risk_reward_ratio: 2, strategy: 'manual',
  reasoning: 'Test', agent_results: [], approved_by_shield: false };

const db = {
  from(table) {
    const filters = {};
    const query = {
      select: () => query,
      eq: (key, value) => { filters[key] = value; return query; },
      maybeSingle: async () => {
        assert.equal(table, 'trade_execution_intents');
        assert.equal(filters.user_id, 'account-a');
        assert.equal(filters.idempotency_key, operation);
        return { data: saved, error: lookupError ? { message: 'offline' } : null };
      },
      insert: async () => ({ error: null }),
    };
    return query;
  },
  async rpc(name, args) {
    calls++;
    assert.equal(name, 'midas_execute_paper_trade');
    assert.equal(args.p_user_id, 'account-a');
    const receipt = { success: true, trade_id: 'trade-1', order_id: `PAPER-${operation}`, operation_id: operation,
      executed_price: 100.05, executed_quantity: 1, fees: 0.10005, slippage_pct: 0.05,
      is_paper: true, error: null, timestamp: 100, state: 'paper_executed', audit_status: 'recorded' };
    saved = { execution_mode: 'paper', request_payload: { decision: args.p_decision, quote_amount: args.p_quote_amount },
      status: 'confirmed', exchange_response: receipt };
    if (loseResponse) throw new Error('response lost after persistence');
    return { data: receipt, error: null };
  },
};

mock.module(new URL('lib/supabase/server.ts', source).href, { namedExports: { createServiceClient: () => db } });
mock.module(new URL('lib/trading/pre-trade-simulation.ts', source).href, { namedExports: {
  simulate: async (_decision, _user, quote) => {
    simulations++;
    assert.equal(quote, 100);
    return { passed: allowed, reasons: allowed ? [] : ['blocked'] };
  },
} });
const { executeTrade } = await import(new URL('lib/trading/trade-executor.ts', source).href);

function reset() { saved = null; lookupError = false; loseResponse = false; calls = 0; simulations = 0; allowed = true; }
const options = { operationId: operation, quoteAmount: 100 };

test('actual executor recovers a committed receipt before re-running changing risk checks', async () => {
  reset(); loseResponse = true;
  const first = await executeTrade(decision, 'account-a', options);
  assert.equal(first.state, 'reconciliation_required');
  assert.equal(first.operation_id, operation);
  allowed = false;
  const replay = await executeTrade(decision, 'account-a', options);
  assert.equal(replay.trade_id, 'trade-1');
  assert.equal(replay.replayed, true);
  assert.equal(calls, 1);
  assert.equal(simulations, 1);
});
test('unavailable receipt lookup never starts a second execution', async () => {
  reset(); lookupError = true;
  const result = await executeTrade(decision, 'account-a', options);
  assert.equal(result.state, 'reconciliation_required');
  assert.equal(calls, 0);
  assert.equal(simulations, 0);
});
test('a blocked simulation never reaches atomic persistence', async () => {
  reset(); allowed = false;
  const result = await executeTrade(decision, 'account-a', options);
  assert.equal(result.state, 'not_executed');
  assert.equal(calls, 0);
});
test('an invalid operation identifier fails before service-role access', async () => {
  reset();
  const result = await executeTrade(decision, 'account-a', { operationId: 'bad' });
  assert.equal(result.success, false);
  assert.equal(calls, 0);
  assert.equal(simulations, 0);
});
