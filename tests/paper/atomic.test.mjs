import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migration = name => readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');
const decision = { action: 'buy', pair: 'BTC/USDT', entry_price: 100, stop_loss: 95, take_profit: 110,
  position_size_pct: 1, confidence: 0.8, composite_score: 0, risk_reward_ratio: 2,
  strategy: 'manual', reasoning: 'Local educational test', agent_results: [] };

before(async () => {
  await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users (id UUID PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
  // Use the actual baseline table definitions, not a simplified trade schema.
  const original = await migration('001_initial_schema.sql');
  for (const table of ['profiles', 'exchange_connections', 'bots', 'trades']) {
    const statement = original.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`));
    assert.ok(statement, `Missing baseline table ${table}`);
    await db.exec(statement[0]);
  }
  await db.exec(await migration('007_trade_execution_intents.sql'));
  await db.exec(await migration('20261011153000_atomic_paper_execution.sql'));
});
after(() => db.close());

async function account() {
  const id = randomUUID();
  await db.query('INSERT INTO auth.users(id) VALUES ($1)', [id]);
  await db.query('INSERT INTO public.profiles(id) VALUES ($1)', [id]);
  return id;
}
async function execute(user, operation, request = decision, quote = 100, daily = 5, positions = 3) {
  const result = await db.query('SELECT public.midas_execute_paper_trade($1, $2, $3, $4, $5, $6) AS receipt',
    [user, operation, JSON.stringify(request), quote, daily, positions]);
  return result.rows[0].receipt;
}
async function counts(user) {
  const result = await db.query(`SELECT
    (SELECT count(*)::int FROM public.trades WHERE user_id=$1) AS trades,
    (SELECT count(*)::int FROM public.trade_audit_logs WHERE user_id=$1) AS audits,
    (SELECT count(*)::int FROM public.trade_execution_intents WHERE user_id=$1) AS intents`, [user]);
  return result.rows[0];
}

test('paper operation needs no exchange account and records an atomic audited receipt', async () => {
  const user = await account();
  const receipt = await execute(user, randomUUID());
  assert.equal(receipt.is_paper, true);
  assert.equal(receipt.state, 'paper_executed');
  assert.equal(receipt.audit_status, 'recorded');
  assert.deepEqual(await counts(user), { trades: 1, audits: 1, intents: 1 });
});
test('retry after a lost response returns exactly the original receipt even after quota exhaustion', async () => {
  const user = await account(); const operation = randomUUID();
  const original = await execute(user, operation, decision, 100, 1, 1);
  const replay = await execute(user, operation, decision, 100, 1, 1);
  assert.deepEqual(replay, original);
  assert.deepEqual(await counts(user), { trades: 1, audits: 1, intents: 1 });
});
test('a reused identifier cannot change the request or expose another account receipt', async () => {
  const user = await account(); const other = await account(); const operation = randomUUID();
  await execute(user, operation);
  await assert.rejects(execute(user, operation, decision, 200), /identifier conflict/);
  await assert.rejects(execute(other, operation), /identifier conflict/);
  assert.deepEqual(await counts(other), { trades: 0, audits: 0, intents: 0 });
});
test('an audit insert failure rolls back both the trade and execution ledger', async () => {
  const user = await account();
  await db.exec(`CREATE FUNCTION public.reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected audit failure'; END $$;
    CREATE TRIGGER reject_test_audit BEFORE INSERT ON public.trade_audit_logs FOR EACH ROW EXECUTE FUNCTION public.reject_test_audit();`);
  try {
    await assert.rejects(execute(user, randomUUID()), /injected audit failure/);
    assert.deepEqual(await counts(user), { trades: 0, audits: 0, intents: 0 });
  } finally { await db.exec('DROP TRIGGER reject_test_audit ON public.trade_audit_logs; DROP FUNCTION public.reject_test_audit();'); }
});
test('parallel submissions on this embedded engine preserve one receipt per operation', async () => {
  const user = await account(); const operation = randomUUID();
  const results = await Promise.all(Array.from({ length: 20 }, () => execute(user, operation)));
  assert.ok(results.every(receipt => receipt.trade_id === results[0].trade_id));
  assert.deepEqual(await counts(user), { trades: 1, audits: 1, intents: 1 });
  // PGlite serializes one connection; a multi-session PostgreSQL lock test is
  // still required before deployment. This is not that concurrency proof.
});
test('distinct operations cannot exceed the atomic daily quota', async () => {
  const user = await account();
  const results = await Promise.allSettled([execute(user, randomUUID(), decision, 100, 1), execute(user, randomUUID(), decision, 100, 1)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.deepEqual(await counts(user), { trades: 1, audits: 1, intents: 1 });
});
test('the quote override cannot exceed risk limits and invalid prices do not persist', async () => {
  const user = await account();
  await assert.rejects(execute(user, randomUUID(), decision, 5000), /allocation limit/);
  await assert.rejects(execute(user, randomUUID(), { ...decision, entry_price: 0 }), /Invalid paper/);
  await assert.rejects(execute(user, randomUUID(), { ...decision, take_profit: 90 }), /stop or target/);
  assert.deepEqual(await counts(user), { trades: 0, audits: 0, intents: 0 });
});
test('untrusted database roles cannot call the service-only execution function', async () => {
  const user = await account();
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    try { await assert.rejects(execute(user, randomUUID()), /permission denied/); }
    finally { await db.exec('RESET ROLE'); }
  }
});
test('the migration can be reapplied without losing stored receipts', async () => {
  const user = await account(); const operation = randomUUID();
  const receipt = await execute(user, operation);
  await db.exec(await migration('20261011153000_atomic_paper_execution.sql'));
  assert.deepEqual(await execute(user, operation), receipt);
});
test('recorded closing fees reduce available paper capital', async () => {
  const user = await account();
  const receipt = await execute(user, randomUUID());
  await db.query("UPDATE public.trades SET status='closed', pnl=0, fees=9950, closed_at=now() WHERE id=$1", [receipt.trade_id]);
  await assert.rejects(execute(user, randomUUID()), /Insufficient paper capital/);
});
