// Real multi-session lock tests. Only run against an explicitly disposable DB.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

const connectionString = process.env.TEST_DATABASE_URL;
assert.equal(process.env.MIDAS_TEST_DATABASE_IS_DISPOSABLE, 'true', 'Disposable database opt-in required');
const url = new URL(connectionString);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/midas_ci', 'Only the local disposable CI database is allowed');
const admin = new pg.Client({ connectionString });
const migration = name => readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');
const decision = { action: 'buy', pair: 'BTC/USDT', entry_price: 100, stop_loss: 95, take_profit: 110,
  position_size_pct: 1, confidence: 0.8, composite_score: 0, risk_reward_ratio: 2,
  strategy: 'manual', reasoning: 'Disposable CI test', agent_results: [] };
const sql = 'SELECT public.midas_execute_paper_trade($1, $2, $3, 100, $4, 3) AS receipt';

before(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;`);
  const original = await migration('001_initial_schema.sql');
  for (const table of ['profiles', 'exchange_connections', 'bots', 'trades']) {
    const statement = original.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`));
    assert.ok(statement);
    await admin.query(statement[0]);
  }
  await admin.query(await migration('007_trade_execution_intents.sql'));
  await admin.query(await migration('20261011153000_atomic_paper_execution.sql'));
  await admin.query(await migration('20261011194000_atomic_paper_observation.sql'));
});
after(() => admin.end());

async function compete(sameOperation) {
  const user = randomUUID(); const operation = randomUUID();
  await admin.query('INSERT INTO auth.users VALUES ($1)', [user]);
  await admin.query('INSERT INTO public.profiles(id) VALUES ($1)', [user]);
  const first = new pg.Client({ connectionString });
  const second = new pg.Client({ connectionString });
  await Promise.all([first.connect(), second.connect()]);
  let pending;
  try {
    await first.query('BEGIN');
    const committed = (await first.query(sql, [user, operation, JSON.stringify(decision), 1])).rows[0].receipt;
    pending = second.query(sql, [user, sameOperation ? operation : randomUUID(), JSON.stringify(decision), 1])
      .then(result => ({ result }), error => ({ error }));
    // Prove that the second PostgreSQL session actually waits on a lock while
    // the first transaction remains open, rather than just running serially.
    let waiting = false;
    const deadline = Date.now() + 3000;
    while (!waiting && Date.now() < deadline) {
      const activity = await admin.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [second.processID]);
      waiting = activity.rows[0]?.wait_event_type === 'Lock';
      if (!waiting) await delay(10);
    }
    assert.equal(waiting, true, 'Second session must wait for the account lock');
    await first.query('COMMIT');
    const result = await pending;
    if (sameOperation) {
      assert.equal(result.error, undefined);
      assert.deepEqual(result.result.rows[0].receipt, committed);
    } else {
      assert.match(result.error?.message ?? '', /daily limit reached/);
    }
    const count = await admin.query('SELECT count(*)::int AS n FROM public.trades WHERE user_id=$1', [user]);
    assert.equal(count.rows[0].n, 1);
  } finally {
    await first.query('ROLLBACK');
    if (pending) await pending;
    await Promise.all([first.end(), second.end()]);
  }
}

test('two PostgreSQL sessions replay one operation after a real row-lock wait', () => compete(true));
test('two distinct operations compete atomically for the final daily quota slot', () => compete(false));

test('two PostgreSQL closing requests charge one exit fee and preserve the first close', async () => {
  const user = randomUUID();
  await admin.query('INSERT INTO auth.users VALUES ($1)', [user]);
  await admin.query('INSERT INTO public.profiles(id) VALUES ($1)', [user]);
  const opened = (await admin.query(sql, [user, randomUUID(), JSON.stringify(decision), 5])).rows[0].receipt;
  const first = new pg.Client({ connectionString }); const second = new pg.Client({ connectionString });
  await Promise.all([first.connect(), second.connect()]);
  const closeSql = 'SELECT public.midas_apply_paper_observation($1,$2,$3,clock_timestamp(),true) AS receipt';
  let pending;
  try {
    await first.query('BEGIN');
    const original = (await first.query(closeSql, [user, opened.trade_id, 110])).rows[0].receipt;
    pending = second.query(closeSql, [user, opened.trade_id, 120]).then(result => ({ result }), error => ({ error }));
    let waiting = false; const deadline = Date.now() + 3000;
    while (!waiting && Date.now() < deadline) {
      waiting = (await admin.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [second.processID])).rows[0]?.wait_event_type === 'Lock';
      if (!waiting) await delay(10);
    }
    assert.equal(waiting, true); await first.query('COMMIT');
    const replay = await pending; assert.equal(replay.error, undefined);
    assert.deepEqual(replay.result.rows[0].receipt.trade, original.trade);
    assert.equal(replay.result.rows[0].receipt.replayed, true);
    const audits = await admin.query("SELECT count(*)::int AS n FROM public.trade_audit_logs WHERE user_id=$1 AND action='paper_closed'", [user]);
    assert.equal(audits.rows[0].n, 1);
  } finally {
    await first.query('ROLLBACK'); if (pending) await pending;
    await Promise.all([first.end(), second.end()]);
  }
});
