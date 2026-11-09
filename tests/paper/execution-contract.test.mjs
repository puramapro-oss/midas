// Real executor -> simulation -> risk manager -> paper engine -> actual SQL.
// Only the Supabase transport and external market feed are controlled here.
import test, { before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const source = new URL('../../src/', import.meta.url);
registerHooks({ resolve(specifier, context, nextResolve) {
  let url;
  if (specifier.startsWith('@/')) url = new URL(specifier.slice(2), source);
  else if (specifier.startsWith('.') && context.parentURL?.startsWith(source.href)) url = new URL(specifier, context.parentURL);
  if (url && !url.pathname.endsWith('.ts') && existsSync(fileURLToPath(url) + '.ts')) url = new URL(url.href + '.ts');
  return nextResolve(url?.href ?? specifier, context);
} });
const db = new PGlite();
const migration = name => readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');
const tableNames = ['profiles', 'trading_settings', 'trades', 'trade_execution_intents', 'trade_audit_logs'];
const safeName = name => { assert.match(name, /^[a-z_]+$/); return name; };
let rpcCalls;
let beforeRpc;
let loseResponse;
let staleFeed;
beforeEach(() => { rpcCalls = 0; beforeRpc = null; loseResponse = false; staleFeed = false; });

const transport = {
  from(table) {
    assert.ok(tableNames.includes(table), `Unexpected external/account access: ${table}`);
    const filters = []; const values = [];
    let fields = '*'; let order = ''; let limit = ''; let exactCount = false;
    const where = () => filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
    const run = async single => {
      const result = await db.query(`SELECT to_jsonb(t) AS item FROM (SELECT ${fields} FROM public.${table}${where()}${order}${limit}) t`, values);
      const rows = result.rows.map(row => row.item);
      const count = exactCount ? (await db.query(`SELECT count(*)::int AS n FROM public.${table}${where()}`, values)).rows[0].n : null;
      return { data: single ? rows[0] ?? null : rows, count, error: null };
    };
    const query = {
      select(columns, options) {
        fields = columns === '*' ? '*' : columns.split(',').map(value => safeName(value.trim())).join(',');
        exactCount = options?.count === 'exact'; return query;
      },
      eq(key, value) { values.push(value); filters.push(`${safeName(key)}=$${values.length}`); return query; },
      gte(key, value) { values.push(value); filters.push(`${safeName(key)}>=$${values.length}`); return query; },
      order(key, options) { order = ` ORDER BY ${safeName(key)} ${options.ascending ? 'ASC' : 'DESC'}`; return query; },
      limit(value) { assert.ok(Number.isSafeInteger(value) && value > 0); limit = ` LIMIT ${value}`; return query; },
      single: () => run(true), maybeSingle: () => run(true),
      then: (resolve, reject) => run(false).then(resolve, reject),
      async insert(row) {
        assert.equal(table, 'trade_audit_logs');
        const keys = Object.keys(row).map(safeName);
        await db.query(`INSERT INTO public.${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})`,
          keys.map(key => typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]));
        return { error: null };
      },
    };
    return query;
  },
  async rpc(name, args) {
    assert.equal(name, 'midas_execute_paper_trade');
    rpcCalls++;
    if (beforeRpc) { const hook = beforeRpc; beforeRpc = null; await hook(); }
    try {
      const result = await db.query('SELECT public.midas_execute_paper_trade($1,$2,$3,$4,$5,$6) AS receipt',
        [args.p_user_id, args.p_operation_id, JSON.stringify(args.p_decision), args.p_quote_amount, args.p_daily_limit, args.p_max_positions]);
      if (loseResponse) throw new Error('Injected response loss after COMMIT');
      return { data: result.rows[0].receipt, error: null };
    } catch (error) { return { data: null, error: { message: error.message, code: error.code } }; }
  },
};
mock.module(new URL('lib/supabase/server.ts', source).href, { namedExports: { createServiceClient: () => transport } });
mock.module(new URL('lib/exchange/binance-public.ts', source).href, { namedExports: { fetchKlines: async () => {
  const now = Date.now() - (staleFeed ? 3600000 : 0);
  return Array.from({ length: 61 }, (_, i) => ({ timestamp: now - (60 - i) * 60000, close: 100 }));
} } });
const { executeTrade } = await import(new URL('lib/trading/trade-executor.ts', source).href);
const { simulate } = await import(new URL('lib/trading/pre-trade-simulation.ts', source).href);
const decision = { action: 'buy', pair: 'BTC/USDT', entry_price: 100, stop_loss: 95, take_profit: 110,
  position_size_pct: 0.1, confidence: 0.8, composite_score: 0, risk_reward_ratio: 2, strategy: 'manual',
  reasoning: 'Isolated execution contract test', agent_results: [], approved_by_shield: false };

before(async () => {
  await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;`);
  const original = await migration('001_initial_schema.sql');
  for (const table of ['profiles', 'exchange_connections', 'bots', 'trades']) {
    const statement = original.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`));
    assert.ok(statement); await db.exec(statement[0]);
  }
  for (const name of ['007_trade_execution_intents.sql', '20261011153000_atomic_paper_execution.sql',
    '20261011194000_atomic_paper_observation.sql', '20261109193000_paper_risk_budget.sql']) await db.exec(await migration(name));
});
after(() => db.close());

async function account(capital = 10000, daily = 100) {
  const id = randomUUID();
  await db.query('INSERT INTO auth.users(id) VALUES ($1)', [id]);
  await db.query('INSERT INTO public.profiles(id) VALUES ($1)', [id]);
  await db.query('INSERT INTO public.trading_settings(user_id,paper_capital,capital_usd,daily_loss_limit_usd) VALUES ($1,$2,1,$3)', [id, capital, daily]);
  return id;
}
async function rows(user) {
  return (await db.query('SELECT to_jsonb(t) AS item FROM public.trades t WHERE user_id=$1', [user])).rows.map(row => row.item);
}

test('complete paper execution uses the explicit quote, paper capital, actual fees and an audited receipt', async () => {
  const user = await account();
  const result = await executeTrade(decision, user, { operationId: randomUUID(), quoteAmount: 100 });
  assert.equal(result.success, true); assert.equal(rpcCalls, 1);
  const [trade] = await rows(user);
  assert.equal(trade.id, result.trade_id); assert.equal(trade.is_paper_trade, true);
  assert.ok(trade.quote_amount > 99.99 && trade.quote_amount <= 100);
  assert.equal(trade.entry_price, result.executed_price); assert.equal(trade.quantity, result.executed_quantity);
  assert.equal(trade.fees, result.fees);
  const audit = (await db.query("SELECT details FROM public.trade_audit_logs WHERE user_id=$1 AND action='paper_executed'", [user])).rows[0].details;
  assert.ok(audit.paper_risk_budget.new_position_loss > 5.2);
  assert.equal(audit.paper_risk_budget.daily_limit, 100);
  const grossTargetGain = Math.round((decision.take_profit - result.executed_price) * result.executed_quantity * 1e8) / 1e8;
  const targetExitFee = Math.round(decision.take_profit * result.executed_quantity * 0.001 * 1e8) / 1e8;
  const expectedReward = grossTargetGain - result.fees - targetExitFee;
  assert.ok(Math.abs(audit.paper_risk_budget.new_position_reward - expectedReward) < 1e-8);
  assert.ok(Math.abs(trade.risk_reward_ratio - expectedReward / audit.paper_risk_budget.new_position_loss) < 1e-8);
  assert.ok(trade.risk_reward_ratio >= 1.5);
});
test('complete executor rejects an oversized quote before persistence', async () => {
  const user = await account();
  const result = await executeTrade(decision, user, { operationId: randomUUID(), quoteAmount: 5000 });
  assert.equal(result.success, false); assert.equal(rpcCalls, 0); assert.deepEqual(await rows(user), []);
});
test('complete executor rejects nominally affordable risk when slippage and fees exhaust the budget', async () => {
  const user = await account(5);
  await db.query(`INSERT INTO public.trades(user_id,exchange,pair,side,entry_price,quantity,quote_amount,stop_loss,strategy,
    is_paper_trade,status,pnl,fees,closed_at) VALUES ($1,'paper','BTC/USDT','buy',100,1,100,95,'fixture',true,'closed',-0.0474,0,now())`, [user]);
  const result = await executeTrade(decision, user, { operationId: randomUUID(), quoteAmount: 0.05 });
  assert.equal(result.success, false); assert.equal(rpcCalls, 0);
  assert.match(result.error, /Daily loss/); assert.equal((await rows(user)).length, 1);
});
test('the SQL budget rejects a state change after the real preflight has passed', async () => {
  const user = await account(10000, 10);
  beforeRpc = () => db.query('SELECT public.midas_execute_paper_trade($1,$2,$3,100,5,3)', [user, randomUUID(), JSON.stringify(decision)]);
  const result = await executeTrade(decision, user, { operationId: randomUUID(), quoteAmount: 100 });
  assert.equal(rpcCalls, 1); assert.equal(result.success, false);
  assert.equal(result.state, 'not_executed'); assert.equal(result.error, 'Daily paper loss budget reached');
  assert.equal((await rows(user)).length, 1, 'Only the intervening operation may be committed');
});
test('the complete executor reconciles a committed response loss before changed policy or market checks', async () => {
  const user = await account(); const options = { operationId: randomUUID(), quoteAmount: 100 };
  loseResponse = true;
  const unknown = await executeTrade(decision, user, options);
  assert.equal(unknown.state, 'reconciliation_required');
  await db.query('UPDATE public.trading_settings SET daily_loss_limit_usd=0 WHERE user_id=$1', [user]);
  loseResponse = false; staleFeed = true;
  const replay = await executeTrade(decision, user, options);
  assert.equal(replay.success, true); assert.equal(replay.replayed, true); assert.equal(rpcCalls, 1);
  assert.equal((await rows(user)).length, 1);
});
test('simulation and committed fill use the same documented slippage assumptions', async () => {
  for (const pair of ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT']) {
    const user = await account(); const request = { ...decision, pair };
    const preflight = await simulate(request, user, 100);
    const result = await executeTrade(request, user, { operationId: randomUUID(), quoteAmount: 100 });
    assert.equal(preflight.passed, true); assert.equal(result.success, true);
    assert.equal(result.slippage_pct, preflight.estimated_slippage_pct);
  }
});
test('effective risk/reward prevents the real executor from persisting a nominally valid trade', async () => {
  const user = await account();
  const request = { ...decision, take_profit: 108, risk_reward_ratio: 1.6 };
  const result = await executeTrade(request, user, { operationId: randomUUID(), quoteAmount: 100 });
  assert.equal(result.success, false); assert.equal(rpcCalls, 0);
  assert.match(result.error, /risk\/reward/i); assert.deepEqual(await rows(user), []);
});
