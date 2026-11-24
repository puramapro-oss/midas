import { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

export const db = new PGlite();
export const migration = name => readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');
export const decision = { action: 'buy', pair: 'BTC/USDT', entry_price: 100, stop_loss: 95, take_profit: 110,
  position_size_pct: 1, confidence: 0.8, composite_score: 0, risk_reward_ratio: 2,
  strategy: 'manual', reasoning: 'Local educational test', agent_results: [] };

before(async () => {
  await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users (id UUID PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
  // Use the actual baseline table definitions, not a simplified trade schema.
  const original = await migration('001_initial_schema.sql');
  for (const table of ['profiles', 'exchange_connections', 'bots', 'trades']) {
    const statement = original.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`));
    assert.ok(statement, `Missing baseline table ${table}`);
    await db.exec(statement[0]);
  }
  // Reproduce Supabase table grants and the repository's actual baseline RLS,
  // so service-only RPC tests cannot hide direct client table mutations.
  await db.exec('GRANT USAGE ON SCHEMA auth TO authenticated; GRANT ALL ON public.trades, public.profiles TO authenticated;');
  await db.exec(original.match(/ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY;/)[0]);
  await db.exec(original.match(/CREATE POLICY "Users own profile"[^;]+;/)[0]);
  await db.exec(original.match(/ALTER TABLE public\.trades ENABLE ROW LEVEL SECURITY;/)[0]);
  await db.exec(original.match(/CREATE POLICY "Users own trades"[^;]+;/)[0]);
  await db.exec(await migration('007_trade_execution_intents.sql'));
  await db.exec(await migration('20261011153000_atomic_paper_execution.sql'));
  await db.exec(await migration('20261011194000_atomic_paper_observation.sql'));
  await db.exec(await migration('20261109193000_paper_risk_budget.sql'));
});
after(() => db.close());

export async function limits(user, { capital = 10000, daily = 100, weekly = 500, monthly = 2000 } = {}) {
  await db.query(`INSERT INTO public.trading_settings(user_id, paper_capital, daily_loss_limit_usd, weekly_loss_limit_usd, monthly_loss_limit_usd)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO UPDATE SET paper_capital=$2,
    daily_loss_limit_usd=$3, weekly_loss_limit_usd=$4, monthly_loss_limit_usd=$5`, [user, capital, daily, weekly, monthly]);
}
export async function closedHistory(user, pnl, fees = 0, date = new Date().toISOString()) {
  await db.query(`INSERT INTO public.trades(user_id, exchange, pair, side, entry_price, quantity, quote_amount,
    stop_loss, strategy, is_paper_trade, status, pnl, fees, closed_at)
    VALUES ($1,'paper','BTC/USDT','buy',100,1,100,95,'fixture',true,'closed',$2,$3,$4)`, [user, pnl, fees, date]);
}

export async function account() {
  const id = randomUUID();
  await db.query('INSERT INTO auth.users(id) VALUES ($1)', [id]);
  await db.query('INSERT INTO public.profiles(id) VALUES ($1)', [id]);
  return id;
}
export async function execute(user, operation, request = decision, quote = 100, daily = 5, positions = 3) {
  const result = await db.query('SELECT public.midas_execute_paper_trade($1, $2, $3, $4, $5, $6) AS receipt',
    [user, operation, JSON.stringify(request), quote, daily, positions]);
  return result.rows[0].receipt;
}
export async function counts(user) {
  const result = await db.query(`SELECT
    (SELECT count(*)::int FROM public.trades WHERE user_id=$1) AS trades,
    (SELECT count(*)::int FROM public.trade_audit_logs WHERE user_id=$1) AS audits,
    (SELECT count(*)::int FROM public.trade_execution_intents WHERE user_id=$1) AS intents`, [user]);
  return result.rows[0];
}

export async function observe(user, trade, price, manual = false, date = new Date().toISOString()) {
  const result = await db.query('SELECT public.midas_apply_paper_observation($1,$2,$3,$4,$5) AS receipt', [user, trade, price, date, manual]);
  return result.rows[0].receipt;
}
