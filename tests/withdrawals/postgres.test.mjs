// Native PostgreSQL, isolated account fixtures only. Never a broker or Stripe call.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createRequire } from 'node:module';
import { requireDisposableDatabase } from '../paper/disposable-database.mjs';

const require = createRequire(new URL('../paper/package.json', import.meta.url));
const pg = require('pg');
const connectionString = requireDisposableDatabase(process.env.TEST_DATABASE_URL, process.env.MIDAS_TEST_DATABASE_IS_DISPOSABLE);
const admin = new pg.Client({ connectionString });
const migration = await readFile(new URL('../../supabase/migrations/20261123020000_atomic_wallet_withdrawals.sql', import.meta.url), 'utf8');
const adminId = randomUUID();
const read = (relative) => readFile(new URL('../../' + relative, import.meta.url), 'utf8');
function table(source, name) {
  const statement = source.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name.replaceAll('.', '\\.')} \\([\\s\\S]*?\\n\\);`));
  assert(statement, `Actual baseline table not found: ${name}`);
  return statement[0];
}
before(async () => {
  await admin.connect();
  assert.equal((await admin.query("SELECT count(*)::int AS n FROM pg_namespace WHERE nspname IN ('auth','midas')")).rows[0].n, 0, 'An empty disposable DB is required');
  await admin.query(`CREATE SCHEMA auth; CREATE SCHEMA midas;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    GRANT USAGE ON SCHEMA public,midas,auth TO anon,authenticated,service_role;`);
  const original = await read('schema.sql');
  for (const name of ['midas.profiles','midas.wallets','midas.wallet_transactions','midas.withdrawal_requests']) {
    await admin.query(table(original,name));
  }
  const subscriptionColumns=(await read('migrations/v6_paiement.sql')).match(/ALTER TABLE midas\.profiles[\s\S]*?;/);
  assert(subscriptionColumns,'The actual subscription date migration is required');
  await admin.query(subscriptionColumns[0]);
  await admin.query(table(await read('migrations/v4.1-connect-accounts.sql'),'public.connect_accounts'));
  await admin.query(table(await read('migrations/v4.1-connect-withdrawals.sql'),'public.connect_withdrawals'));
  const legacySql=await read('migrations/v4.1-connect-withdrawals.sql');
  for(const name of ['debit_wallet_for_withdrawal','credit_wallet_on_withdrawal_failure']){
    const statement=legacySql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`));
    assert(statement,`Actual legacy RPC missing: ${name}`);
    await admin.query(statement[0]);
    await admin.query(`GRANT EXECUTE ON FUNCTION public.${name}(uuid,numeric) TO service_role`);
  }
  // Reproduce the old client INSERT grant/policy so the regression exercises it.
  await admin.query(`ALTER TABLE midas.withdrawal_requests ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON ALL TABLES IN SCHEMA midas,public TO service_role,authenticated,anon;
    CREATE POLICY withdrawal_insert ON midas.withdrawal_requests FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id);`);
  await admin.query(migration);
  await admin.query('INSERT INTO auth.users VALUES($1,$2)',[adminId,'matiss.frasne@gmail.com']);
  await admin.query("INSERT INTO midas.profiles(id,email,role) VALUES($1,$2,'super_admin')",[adminId,'matiss.frasne@gmail.com']);
});
after(() => admin.end());

async function client(role='service_role') {
  const c = new pg.Client({ connectionString }); await c.connect();
  await c.query(`SET ROLE ${role}`); return c;
}

// Recovery note: this middle section was newly implemented after the transient
// checkout was lost. The preserved source fragments are recorded separately in
// midas-withdraw-review/native-fragments.json. This file requires a fresh run;
// historical PASS counts do not qualify the reconstruction.

async function use(action, role='service_role') {
  const c=await client(role);
  try { return await action(c); }
  finally { await c.end(); }
}
async function account(initialBalance=100) {
  const user=randomUUID(), destination='acct_'+randomUUID().replaceAll('-',''), key=randomUUID();
  await admin.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[user,'fixture@example.invalid']);
  await admin.query('INSERT INTO midas.profiles(id,email,wallet_balance) VALUES($1,$2,$3)',[user,'fixture@example.invalid',initialBalance]);
  await admin.query('INSERT INTO public.connect_accounts(user_id,stripe_account_id,payouts_enabled,kyc_verified_at) VALUES($1,$2,true,now())',[user,destination]);
  return {user,destination,key};
}
async function balance(a) {
  return Number((await admin.query('SELECT wallet_balance FROM midas.profiles WHERE id=$1',[a.user])).rows[0].wallet_balance);
}
async function legacyBalance(a) {
  return Number((await admin.query('SELECT balance FROM midas.wallets WHERE user_id=$1',[a.user])).rows[0].balance);
}
async function journal(a) {
  return (await admin.query('SELECT * FROM public.connect_withdrawals WHERE user_id=$1 ORDER BY created_at,id',[a.user])).rows;
}
async function legacyState(id) {
  return (await admin.query('SELECT * FROM midas.withdrawal_requests WHERE id=$1',[id])).rows[0];
}
async function creditCount(id) {
  return (await admin.query("SELECT count(*)::int AS n FROM midas.wallet_transactions WHERE reference_id=$1 AND type='credit'",[id])).rows[0].n;
}
async function admit(a, amount=20, overrides={}, connection) {
  const args={user:a.user,key:a.key,amount,destination:a.destination,cap:100000,...overrides};
  const action=async(c)=>(await c.query('SELECT public.admit_connect_withdrawal($1,$2,$3,$4,$5) AS r',
    [args.user,args.key,args.amount,args.destination,args.cap])).rows[0].r;
  return connection ? action(connection) : use(action);
}
async function reconcile(a, receipt, reversed=0, overrides={}, connection) {
  const args={user:a.user,id:receipt.id,transfer:'tr_'+receipt.id.replaceAll('-',''),destination:a.destination,
    amount:Number(receipt.amount_eur),currency:'eur',reversed,...overrides};
  const action=async(c)=>(await c.query('SELECT public.reconcile_connect_withdrawal($1,$2,$3,$4,$5,$6,$7) AS r',
    [args.user,args.id,args.transfer,args.destination,args.amount,args.currency,args.reversed])).rows[0].r;
  return connection ? action(connection) : use(action);
}
async function legacy(a, {amount=20,proof=true,status='pending',marker=false}={}) {
  const id=randomUUID();
  await admin.query('INSERT INTO midas.wallets(user_id,balance) VALUES($1,80)',[a.user]);
  await admin.query("INSERT INTO midas.withdrawal_requests(id,user_id,amount,iban,status,refund_credited_at) VALUES($1,$2,$3,'fixture',$4,CASE WHEN $5::boolean THEN now() ELSE NULL END)",[id,a.user,amount,status,marker]);
  if(proof) await admin.query("INSERT INTO midas.wallet_transactions(user_id,type,amount,source,reference_id) VALUES($1,'debit',$2,'withdrawal',$3)",[a.user,amount,id]);
  return id;
}
async function decide(id, action='rejected', actor=adminId, connection) {
  const run=async(c)=>(await c.query('SELECT midas.decide_wallet_withdrawal($1,$2,$3,$4) AS r',[actor,id,action,'fixture'])).rows[0].r;
  return connection ? run(connection) : use(run);
}
async function expectNativeWait(waiterPid, blockerPid) {
  const deadline=Date.now()+5000;
  while(Date.now()<deadline) {
    const row=(await admin.query('SELECT pg_blocking_pids($1) AS blockers,wait_event_type FROM pg_stat_activity WHERE pid=$1',[waiterPid])).rows[0];
    if(row?.wait_event_type==='Lock' && row.blockers.includes(blockerPid)) return;
    await delay(10);
  }
  assert.fail('Independent native session did not wait for the expected row-lock owner');
}
async function contend(action) {
  const first=await client(),second=await client();
  let inFlight;
  try {
    await first.query('BEGIN');
    const firstReceipt=await action(first);
    inFlight=action(second).then(value=>({value}),error=>({error}));
    await expectNativeWait(second.processID,first.processID);
    await first.query('COMMIT');
    const secondOutcome=await inFlight;
    if(secondOutcome.error) throw secondOutcome.error;
    return [firstReceipt,secondOutcome.value];
  } finally {
    await first.query('ROLLBACK').catch(()=>{});
    if(inFlight) await inFlight;
    await first.end(); await second.end();
  }
}

test('migration compiles and repeat application preserves receipt data',async()=>{
  const a=await account(),receipt=await admit(a);
  await reconcile(a,receipt,5);
  const before=await journal(a),beforeBalance=await balance(a);
  await admin.query(migration);
  assert.deepEqual(await journal(a),before);
  assert.equal(await balance(a),beforeBalance);
});
test('identical concurrent admissions wait on the same lock and debit once',async()=>{
  const a=await account();
  const receipts=await contend(c=>admit(a,20,{},c));
  assert.equal(receipts.filter(r=>r.applied).length,1);
  assert.equal(receipts[0].id,receipts[1].id);
  assert.equal(await balance(a),80);
  assert.equal((await journal(a)).length,1);
});
test('a new key cannot bypass an unresolved provider outcome',async()=>{
  const a=await account();await admit(a);
  await assert.rejects(admit(a,20,{key:randomUUID()}),/withdrawal_reconciliation_required/);
  assert.equal(await balance(a),80);assert.equal((await journal(a)).length,1);
});
test('withdraw-all retries retain the initial amount after the balance changed',async()=>{
  const a=await account(),first=await admit(a,null);
  assert.equal(Number(first.amount_eur),100);assert.equal(await balance(a),0);
  await admin.query('UPDATE midas.profiles SET wallet_balance=35 WHERE id=$1',[a.user]);
  const replay=await admit(a,null);
  assert.equal(replay.id,first.id);assert.equal(replay.applied,false);
  assert.equal(Number(replay.amount_eur),100);assert.equal(await balance(a),35);
  assert.equal((await journal(a)).length,1);
});
test('same key with a different amount or destination is rejected',async()=>{
  const a=await account();await admit(a);
  const canonical=await admit(a,20,{key:a.key.toUpperCase()});
  assert.equal(canonical.request_key,a.key);assert.equal(canonical.applied,false);
  await assert.rejects(admit(a,30),/withdrawal_idempotency_conflict/);
  await assert.rejects(admit(a,20,{destination:'acct_different'}),/withdrawal_idempotency_conflict/);
  assert.equal(await balance(a),80);assert.equal((await journal(a)).length,1);
});
test('admission journal failure rolls back the debit, without an orphan request',async()=>{
  const a=await account();
  await admin.query("CREATE FUNCTION public.fixture_reject_journal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture journal failure'; END $$; CREATE TRIGGER fixture_reject_journal BEFORE INSERT ON public.connect_withdrawals FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_journal();");
  try {
    await assert.rejects(admit(a),/fixture journal failure/);
    assert.equal(await balance(a),100);assert.equal((await journal(a)).length,0);
  } finally {await admin.query('DROP TRIGGER fixture_reject_journal ON public.connect_withdrawals; DROP FUNCTION public.fixture_reject_journal()');}
});
test('same request after durable receipt replays without another debit',async()=>{
  const a=await account(),initial=await admit(a),confirmed=await reconcile(a,initial);
  await admin.query("UPDATE public.connect_withdrawals SET created_at=now()-interval '3 days' WHERE id=$1",[initial.id]);
  const replay=await admit(a);
  assert.equal(replay.applied,false);assert.equal(replay.provider_confirmed,true);
  assert.equal(replay.id,initial.id);assert.equal(replay.stripe_transfer_id,confirmed.stripe_transfer_id);
  assert.equal(await balance(a),80);assert.equal((await journal(a)).length,1);
});
test('partial, duplicate, older and complete reversals credit cumulative deltas only',async()=>{
  const a=await account(),r=await admit(a);
  const observations=[[0,0,80,'pending'],[5,5,85,'pending'],[5,0,85,'pending'],[2,0,85,'pending'],[20,15,100,'reversed'],[0,0,100,'reversed']];
  for(const [observed,credited,expectedBalance,status] of observations) {
    const receipt=await reconcile(a,r,observed);
    assert.equal(Number(receipt.credited_eur),credited);
    assert.equal(await balance(a),expectedBalance);assert.equal(receipt.status,status);
  }
  const [row]=await journal(a);
  assert.equal(Number(row.credited_reversal_eur),20);
  assert.equal(row.status,'reversed');assert.ok(row.provider_confirmed_at);
});
test('two native reversal sessions cannot credit the same cumulative amount twice',async()=>{
  const a=await account(),r=await admit(a);
  const receipts=await contend(c=>reconcile(a,r,5,{},c));
  assert.deepEqual(receipts.map(value=>Number(value.credited_eur)),[5,0]);
  assert.equal(await balance(a),85);
  assert.equal(Number((await journal(a))[0].credited_reversal_eur),5);
});
test('mismatched amount, destination, user, currency and transfer ID cannot refund',async()=>{
  const a=await account(),other=await account(),r=await admit(a);
  await reconcile(a,r);
  const invalid=[{amount:21},{destination:'acct_wrong'},{user:other.user},{currency:'usd'},{transfer:'tr_other'}];
  for(const value of invalid) await assert.rejects(reconcile(a,r,5,value),/withdrawal_(receipt_invalid|receipt_mismatch|reconciliation_required)/);
  assert.equal(await balance(a),80);assert.equal(await balance(other),100);
  assert.equal(Number((await journal(a))[0].credited_reversal_eur),0);
});
test('nonfinite, negative, subcent and excessive reversal inputs are refused',async()=>{
  const a=await account(),r=await admit(a);
  for(const value of ['NaN','Infinity','-Infinity',-1,20.001,21,null]) {
    await assert.rejects(reconcile(a,r,value),/withdrawal_receipt_invalid/);
  }
  for(const amount of ['NaN','Infinity','-Infinity',-1,19,20.001,100001,null]) {
    await assert.rejects(reconcile(a,r,0,{amount}),/withdrawal_receipt_invalid/);
  }
  for(const amount of ['NaN','Infinity','-Infinity',-1,20.001,100001]) {
    await assert.rejects(admit(a,amount,{key:randomUUID()}),/withdrawal_invalid_request/);
  }
  assert.equal(await balance(a),80);assert.equal(Number((await journal(a))[0].credited_reversal_eur),0);
});
test('a reversal failure rolls back both the credit and its receipt',async()=>{
  const a=await account(),r=await admit(a);
  await admin.query("CREATE FUNCTION public.fixture_reject_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture receipt failure'; END $$; CREATE TRIGGER fixture_reject_receipt BEFORE UPDATE ON public.connect_withdrawals FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_receipt();");
  try {
    await assert.rejects(reconcile(a,r,5),/fixture receipt failure/);
    assert.equal(await balance(a),80);assert.equal(Number((await journal(a))[0].credited_reversal_eur),0);
  } finally {await admin.query('DROP TRIGGER fixture_reject_receipt ON public.connect_withdrawals; DROP FUNCTION public.fixture_reject_receipt()');}
});
test('ambiguous legacy Connect rows remain unmodified and require reconciliation',async()=>{
  const a=await account();
  const inserted=(await admin.query('INSERT INTO public.connect_withdrawals(user_id,stripe_account_id,amount_eur) VALUES($1,$2,20) RETURNING *',[a.user,a.destination])).rows[0];
  const before=await journal(a);
  await admin.query(migration);
  await assert.rejects(admit(a),/withdrawal_reconciliation_required/);
  await assert.rejects(reconcile(a,inserted,5),/withdrawal_reconciliation_required/);
  assert.deepEqual(await journal(a),before);assert.equal(await balance(a),100);
});
test('authenticated and anonymous roles cannot call monetary RPCs or forge legacy requests',async()=>{
  const a=await account(),r=await admit(a);
  for(const role of ['authenticated','anon']) await use(async(c)=>{
    await c.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[a.user]);
    await assert.rejects(admit(a,20,{},c),/permission denied/);
    await assert.rejects(reconcile(a,r,5,{},c),/permission denied/);
    await assert.rejects(decide(randomUUID(),'rejected',adminId,c),/permission denied/);
    await assert.rejects(c.query("INSERT INTO midas.withdrawal_requests(user_id,amount,iban,status,refund_credited_at) VALUES($1,20,'fixture','rejected',now())",[a.user]),/permission denied/);
    await assert.rejects(c.query("UPDATE midas.withdrawal_requests SET refund_credited_at=now() WHERE user_id=$1",[a.user]),/permission denied/);
    await assert.rejects(c.query('DELETE FROM midas.withdrawal_requests WHERE user_id=$1',[a.user]),/permission denied/);
  },role);
  assert.equal(await balance(a),80);
});
test('admin rejection credits the legacy wallet once and leaves Connect unchanged',async()=>{
  const a=await account(),id=await legacy(a),first=await decide(id),replay=await decide(id);
  assert.equal(first.applied,true);assert.equal(first.refunded,true);assert.equal(replay.applied,false);
  assert.equal(await legacyBalance(a),100);assert.equal(await balance(a),100);assert.equal(await creditCount(id),1);
  const state=await legacyState(id);assert.equal(state.status,'rejected');assert.ok(state.refund_credited_at);
});
test('two native admin decisions cannot refund the same debit twice',async()=>{
  const a=await account(),id=await legacy(a);
  const receipts=await contend(c=>decide(id,'rejected',adminId,c));
  assert.equal(receipts.filter(r=>r.applied).length,1);
  assert.equal(await legacyBalance(a),100);assert.equal(await creditCount(id),1);
});
test('legacy missing, forged terminal and ambiguous debit evidence cannot yield a refund',async()=>{
  for(const status of ['pending','processed','rejected']) {
    const a=await account(),id=await legacy(a,{proof:false,status,marker:status==='rejected'});
    if(status==='rejected') await admin.query("INSERT INTO midas.wallet_transactions(user_id,type,amount,source,reference_id) VALUES($1,'credit',20,'manual',$2)",[a.user,id]);
    await assert.rejects(decide(id,status==='processed'?'processed':'rejected'),/withdrawal_debit_proof_required/);
    assert.equal(await legacyBalance(a),80);
  }
  for(const type of ['duplicate','wrong_amount','forged_refund']) {
    const a=await account(),id=await legacy(a);
    if(type==='duplicate') await admin.query("INSERT INTO midas.wallet_transactions(user_id,type,amount,source,reference_id) VALUES($1,'debit',20,'withdrawal',$2)",[a.user,id]);
    if(type==='wrong_amount') await admin.query('UPDATE midas.wallet_transactions SET amount=15 WHERE reference_id=$1',[id]);
    if(type==='forged_refund') await admin.query("UPDATE midas.withdrawal_requests SET status='rejected',refund_credited_at=now() WHERE id=$1",[id]);
    await assert.rejects(decide(id),/withdrawal_(debit_proof_required|reconciliation_required)/);
    assert.equal(await legacyBalance(a),80);assert.equal(await creditCount(id),0);
  }
});
test('a refund journal failure rolls back wallet balance and request status',async()=>{
  const a=await account(),id=await legacy(a);
  await admin.query("CREATE FUNCTION midas.fixture_reject_credit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type='credit' THEN RAISE EXCEPTION 'fixture credit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_reject_credit BEFORE INSERT ON midas.wallet_transactions FOR EACH ROW EXECUTE FUNCTION midas.fixture_reject_credit();");
  try {
    await assert.rejects(decide(id),/fixture credit failure/);
    assert.equal((await legacyState(id)).status,'pending');assert.equal(await legacyBalance(a),80);assert.equal(await creditCount(id),0);
  } finally {await admin.query('DROP TRIGGER fixture_reject_credit ON midas.wallet_transactions; DROP FUNCTION midas.fixture_reject_credit()');}
});
test('processing a proven request does not refund and a contrary decision is refused',async()=>{
  const a=await account(),id=await legacy(a);
  await assert.rejects(decide(id,'processed',a.user),/withdrawal_admin_required/);
  const first=await decide(id,'processed'),replay=await decide(id,'processed');
  assert.equal(first.applied,true);assert.equal(first.refunded,false);assert.equal(replay.applied,false);
  await assert.rejects(decide(id,'rejected'),/withdrawal_decision_conflict/);
  assert.equal(await legacyBalance(a),80);assert.equal(await creditCount(id),0);
});

test('old unbound debit/refund RPCs and direct Connect journal writes are denied to service clients',async()=>{
  const a=await account();
  await use(async(c)=>{
    for(const name of ['debit_wallet_for_withdrawal','credit_wallet_on_withdrawal_failure']){
      const permission=await admin.query("SELECT has_function_privilege('service_role',$1,'EXECUTE') AS allowed",[`public.${name}(uuid,numeric)`]);
      assert.equal(permission.rows[0].allowed,false);
      await assert.rejects(c.query(`SELECT public.${name}($1,20)`,[a.user]),/permission denied/);
    }
    await assert.rejects(c.query("INSERT INTO public.connect_withdrawals(user_id,stripe_account_id,amount_eur) VALUES($1,$2,20)",[a.user,a.destination]),/permission denied/);
    await assert.rejects(c.query("UPDATE public.connect_withdrawals SET status='reversed' WHERE user_id=$1",[a.user]),/permission denied/);
  });
  assert.equal(await balance(a),100);
});

async function suppress(table,event,action) {
  await admin.query(`CREATE FUNCTION public.fixture_suppress_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
    CREATE TRIGGER fixture_suppress_write BEFORE ${event} ON ${table} FOR EACH ROW EXECUTE FUNCTION public.fixture_suppress_write();`);
  try{return await action();}finally{await admin.query(`DROP TRIGGER fixture_suppress_write ON ${table}; DROP FUNCTION public.fixture_suppress_write()`);}
}
test('a silently suppressed admission journal is refused before a debit',async()=>{
  const a=await account();await suppress('public.connect_withdrawals','INSERT',async()=>{
    await assert.rejects(admit(a),/journal_unconfirmed/);assert.equal(await balance(a),100);
    assert.equal((await admin.query('SELECT count(*)::int AS n FROM public.connect_withdrawals WHERE user_id=$1',[a.user])).rows[0].n,0);
  });
});
test('a silently suppressed profile debit rolls back admission',async()=>{
  const a=await account();await suppress('midas.profiles','UPDATE',async()=>{
    await assert.rejects(admit(a),/debit_unconfirmed/);assert.equal(await balance(a),100);
    assert.equal((await admin.query('SELECT count(*)::int AS n FROM public.connect_withdrawals WHERE user_id=$1',[a.user])).rows[0].n,0);
  });
});
test('a silently suppressed reversal credit cannot advance its receipt',async()=>{
  const a=await account(),r=await admit(a);await suppress('midas.profiles','UPDATE',async()=>{
    await assert.rejects(reconcile(a,r,5),/credit_unconfirmed/);assert.equal(await balance(a),80);
    assert.equal(Number((await admin.query('SELECT credited_reversal_eur FROM public.connect_withdrawals WHERE id=$1',[r.id])).rows[0].credited_reversal_eur),0);
  });
});
test('a silently suppressed transfer receipt rolls back a reversal credit',async()=>{
  const a=await account(),r=await admit(a);await suppress('public.connect_withdrawals','UPDATE',async()=>{
    await assert.rejects(reconcile(a,r,5),/receipt_unconfirmed/);assert.equal(await balance(a),80);
  });
});
test('a silently suppressed legacy refund transaction rolls back its credit',async()=>{
  const a=await account(),id=await legacy(a);await suppress('midas.wallet_transactions','INSERT',async()=>{
    await assert.rejects(decide(id),/refund_journal_unconfirmed/);
    assert.equal(Number((await admin.query('SELECT balance FROM midas.wallets WHERE user_id=$1',[a.user])).rows[0].balance),80);
  });
});
test('a silently suppressed legacy status transition rolls back refund and ledger',async()=>{
  const a=await account(),id=await legacy(a);await suppress('midas.withdrawal_requests','UPDATE',async()=>{
    await assert.rejects(decide(id),/decision_unconfirmed/);
    assert.equal(Number((await admin.query('SELECT balance FROM midas.wallets WHERE user_id=$1',[a.user])).rows[0].balance),80);
    assert.equal((await admin.query("SELECT count(*)::int AS n FROM midas.wallet_transactions WHERE reference_id=$1 AND type='credit'",[id])).rows[0].n,0);
  });
});
test('a silently suppressed legacy wallet credit cannot acknowledge a rejection',async()=>{
  const a=await account(),id=await legacy(a);await suppress('midas.wallets','UPDATE',async()=>{
    await assert.rejects(decide(id),/credit_unconfirmed/);
    assert.equal((await admin.query('SELECT status FROM midas.withdrawal_requests WHERE id=$1',[id])).rows[0].status,'pending');
  });
});

const fixtureIban='DE89370400440532013000';
const otherFixtureIban='FR7630006000011234567890189';
async function walletAccount(initialBalance=100) {
  const a=await account();
  await admin.query('INSERT INTO midas.wallets(user_id,balance) VALUES($1,$2)',[a.user,initialBalance]);
  return a;
}
async function walletAdmit(a,{id=a.key,amount=20,iban=fixtureIban}={},connection) {
  const action=async(c)=>(await c.query('SELECT midas.admit_wallet_withdrawal($1,$2,$3,$4) AS r',[a.user,id,amount,iban])).rows[0].r;
  return connection?action(connection):use(action);
}
async function debitCount(id) {
  return (await admin.query("SELECT count(*)::int AS n FROM midas.wallet_transactions WHERE reference_id=$1 AND type='debit'",[id])).rows[0].n;
}
test('IBAN admission creates the exact debit proof used by rejection and key-only replay',async()=>{
  const a=await walletAccount(),first=await walletAdmit(a);
  assert.equal(first.id,a.key);assert.equal(first.debit_confirmed,true);assert.equal(first.applied,true);
  assert.equal(await legacyBalance(a),80);assert.equal(await debitCount(a.key),1);
  const rejected=await decide(a.key);
  assert.equal(rejected.refunded,true);assert.equal(await legacyBalance(a),100);
  const replay=await walletAdmit(a,{amount:null,iban:null});
  assert.equal(replay.id,a.key);assert.equal(replay.applied,false);assert.equal(replay.status,'rejected');
  assert.equal(replay.refunded,true);assert.equal(await creditCount(a.key),1);
  assert.equal(await balance(a),100);
});
test('IBAN processing and subsequent admission replay never debit or refund a second time',async()=>{
  const a=await walletAccount();await walletAdmit(a);await decide(a.key,'processed');
  const replay=await walletAdmit(a,{amount:null,iban:null});
  assert.equal(replay.status,'processed');assert.equal(replay.applied,false);assert.equal(replay.refunded,false);
  assert.equal(await legacyBalance(a),80);assert.equal(await debitCount(a.key),1);assert.equal(await creditCount(a.key),0);
});
test('two native IBAN admissions wait for the same wallet lock and create one linked debit',async()=>{
  const a=await walletAccount();const receipts=await contend(c=>walletAdmit(a,{},c));
  assert.equal(receipts.filter(r=>r.applied).length,1);
  assert.equal(receipts[0].id,receipts[1].id);assert.equal(await debitCount(a.key),1);assert.equal(await legacyBalance(a),80);
});
test('another key behind a pending IBAN request receives a durable refusal without debit',async()=>{
  const a=await walletAccount();let index=0;const otherKey=randomUUID();
  const receipts=await contend(c=>walletAdmit(a,{id:index++===0?a.key:otherKey},c));
  assert.equal(receipts[0].debit_confirmed,true);assert.equal(receipts[1].rejection_recorded,true);
  assert.equal(receipts[1].admission_rejection,'withdrawal_pending');assert.equal(receipts[1].refunded,false);
  await decide(a.key);
  const late=await walletAdmit(a,{id:otherKey});
  assert.equal(late.rejection_recorded,true);assert.equal(late.applied,false);
  assert.equal(await legacyBalance(a),100);assert.equal(await debitCount(otherKey),0);
});
test('IBAN request IDs cannot be reused for another owner, amount or destination',async()=>{
  const a=await walletAccount(),other=await walletAccount();await walletAdmit(a);
  await assert.rejects(walletAdmit(a,{amount:25}),/withdrawal_idempotency_conflict/);
  await assert.rejects(walletAdmit(a,{iban:otherFixtureIban}),/withdrawal_idempotency_conflict/);
  await assert.rejects(walletAdmit(other,{id:a.key,amount:null,iban:null}),/withdrawal_idempotency_conflict/);
  assert.equal(await legacyBalance(a),80);assert.equal(await legacyBalance(other),100);
});
test('a key-only retry arriving before the original neither admits nor closes that key',async()=>{
  const a=await walletAccount();
  await assert.rejects(walletAdmit(a,{amount:null,iban:null}),/withdrawal_request_not_found/);
  assert.equal(await legacyState(a.key),undefined);assert.equal(await debitCount(a.key),0);
  const original=await walletAdmit(a);assert.equal(original.applied,true);
  assert.equal(await legacyBalance(a),80);assert.equal(await debitCount(a.key),1);
});
test('the existing 30-day gate is enforced atomically and its refused key remains refused later',async()=>{
  const a=await walletAccount();
  await admin.query("UPDATE midas.profiles SET subscription_started_at=now()-interval '24 hours' WHERE id=$1",[a.user]);
  const refusal=await walletAdmit(a);
  assert.equal(refusal.rejection_recorded,true);assert.equal(refusal.admission_rejection,'withdrawal_locked_30d');
  assert.equal(await legacyBalance(a),100);assert.equal(await debitCount(a.key),0);
  await admin.query("UPDATE midas.profiles SET subscription_started_at=now()-interval '721 hours' WHERE id=$1",[a.user]);
  await walletAdmit(a,{id:randomUUID()});
  const late=await walletAdmit(a);assert.equal(late.rejection_recorded,true);assert.equal(late.applied,false);
  assert.equal(await legacyBalance(a),80);assert.equal(await debitCount(a.key),0);
});
test('IBAN admission preserves the five-euro minimum and refuses nonfinite or subcent values',async()=>{
  const a=await walletAccount();
  for(const amount of ['NaN','Infinity','-Infinity',-1,4.99,5.001,10000000000]) {
    await assert.rejects(walletAdmit(a,{amount}),/withdrawal_invalid_request/);
  }
  assert.equal(await legacyState(a.key),undefined);
  assert.equal(Number((await walletAdmit(a,{amount:5})).amount),5);assert.equal(await legacyBalance(a),95);
});
test('silently suppressed IBAN request insertion cannot leave a debit or falsely confirm admission',async()=>{
  const a=await walletAccount();await suppress('midas.withdrawal_requests','INSERT',async()=>{
    await assert.rejects(walletAdmit(a),/journal_unconfirmed/);
    assert.equal(await legacyBalance(a),100);assert.equal(await legacyState(a.key),undefined);assert.equal(await debitCount(a.key),0);
  });
});
test('silently suppressed IBAN wallet debit rolls back its request',async()=>{
  const a=await walletAccount();await suppress('midas.wallets','UPDATE',async()=>{
    await assert.rejects(walletAdmit(a),/debit_unconfirmed/);
    assert.equal(await legacyBalance(a),100);assert.equal(await legacyState(a.key),undefined);assert.equal(await debitCount(a.key),0);
  });
});
test('silently suppressed IBAN debit journal rolls back both wallet and request',async()=>{
  const a=await walletAccount();await suppress('midas.wallet_transactions','INSERT',async()=>{
    await assert.rejects(walletAdmit(a),/debit_journal_unconfirmed/);
    assert.equal(await legacyBalance(a),100);assert.equal(await legacyState(a.key),undefined);assert.equal(await debitCount(a.key),0);
  });
});
test('a refused Connect key cannot debit after funds arrive and another key has been admitted',async()=>{
  for(const [initial,cap,code] of [[10,100000,'insufficient_balance'],[100,10,'withdrawal_cap_exceeded']]) {
    const a=await account(initial),refused=await admit(a,20,{cap});
    assert.equal(refused.rejection_recorded,true);assert.equal(refused.debit_confirmed,false);assert.equal(refused.refunded,false);
    assert.equal(refused.admission_rejection,code);assert.equal(await balance(a),initial);
    await admin.query('UPDATE midas.profiles SET wallet_balance=100 WHERE id=$1',[a.user]);
    const next=await admit(a,20,{key:randomUUID()});await reconcile(a,next);
    const late=await admit(a,20,{cap:100000});
    assert.equal(late.rejection_recorded,true);assert.equal(late.applied,false);assert.equal(await balance(a),80);
    await assert.rejects(reconcile(a,refused,20),/withdrawal_reconciliation_required/);
    await assert.rejects(admit(a,30),/withdrawal_idempotency_conflict/);
  }
});
test('a refused IBAN key cannot debit after credit and a new admission, or be refunded by an admin',async()=>{
  const a=await walletAccount(10),refused=await walletAdmit(a);
  assert.equal(refused.rejection_recorded,true);assert.equal(refused.admission_rejection,'insufficient_balance');
  assert.equal(refused.debit_confirmed,false);assert.equal(refused.refunded,false);
  await admin.query('UPDATE midas.wallets SET balance=100 WHERE user_id=$1',[a.user]);
  await walletAdmit(a,{id:randomUUID()});
  const late=await walletAdmit(a);assert.equal(late.rejection_recorded,true);assert.equal(late.applied,false);
  await assert.rejects(decide(a.key),/withdrawal_not_admitted/);
  assert.equal(await legacyBalance(a),80);assert.equal(await debitCount(a.key),0);assert.equal(await creditCount(a.key),0);
});
test('a silently suppressed Connect refusal cannot claim to close its key',async()=>{
  const a=await account(10);await suppress('public.connect_withdrawals','INSERT',async()=>{
    await assert.rejects(admit(a),/journal_unconfirmed/);
    assert.equal(await balance(a),10);assert.equal((await journal(a)).length,0);
  });
});
test('a silently suppressed IBAN refusal cannot claim to close its key',async()=>{
  const a=await walletAccount(10);await suppress('midas.withdrawal_requests','INSERT',async()=>{
    await assert.rejects(walletAdmit(a),/journal_unconfirmed/);
    assert.equal(await legacyBalance(a),10);assert.equal(await legacyState(a.key),undefined);assert.equal(await debitCount(a.key),0);
  });
});
test('the new IBAN admission and internal receipt are restricted and direct service request writes are denied',async()=>{
  const a=await walletAccount();
  for(const role of ['anon','authenticated']) await use(async(c)=>{
    await assert.rejects(walletAdmit(a,{},c),/permission denied/);
  },role);
  await use(async(c)=>{
    await assert.rejects(c.query('SELECT midas.wallet_withdrawal_receipt(NULL::midas.withdrawal_requests,0,false)'),/permission denied/);
    await assert.rejects(c.query("INSERT INTO midas.withdrawal_requests(id,user_id,amount,iban) VALUES($1,$2,20,$3)",[a.key,a.user,fixtureIban]),/permission denied/);
    await assert.rejects(c.query("UPDATE midas.withdrawal_requests SET status='processed' WHERE user_id=$1",[a.user]),/permission denied/);
  });
  assert.equal(await legacyBalance(a),100);
});
test('a corrupted refusal marker cannot override existing debit proof',async()=>{
  const a=await walletAccount();await walletAdmit(a);
  await admin.query("UPDATE midas.withdrawal_requests SET admission_rejection='insufficient_balance',status='rejected' WHERE id=$1",[a.key]);
  await assert.rejects(walletAdmit(a,{amount:null,iban:null}),/withdrawal_reconciliation_required/);
  assert.equal(await legacyBalance(a),80);
  const b=await account();await admit(b);
  await admin.query("UPDATE public.connect_withdrawals SET admission_rejection='insufficient_balance' WHERE user_id=$1",[b.user]);
  await assert.rejects(admit(b),/withdrawal_reconciliation_required/);assert.equal(await balance(b),80);
});

test('API roles cannot truncate withdrawal proofs or attach triggers or foreign references',async()=>{
  const tables=['public.connect_withdrawals','midas.withdrawal_requests','midas.wallet_transactions'];
  const before=await Promise.all(tables.map(async name=>(await admin.query(`SELECT count(*)::int AS n FROM ${name}`)).rows[0].n));
  await admin.query("CREATE FUNCTION public.fixture_permission_probe() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$");
  for(const role of ['anon','authenticated','service_role']) {
    await admin.query(`CREATE TABLE public.fixture_reference_probe_${role}(reference_id uuid); ALTER TABLE public.fixture_reference_probe_${role} OWNER TO ${role}`);
  }
  try {
    for(const role of ['anon','authenticated','service_role']) await use(async(c)=>{
      for(const table of tables) {
        for(const privilege of ['TRUNCATE','TRIGGER','REFERENCES']) {
          assert.equal((await admin.query('SELECT has_table_privilege($1,$2,$3) AS allowed',[role,table,privilege])).rows[0].allowed,false);
        }
        await assert.rejects(c.query(`TRUNCATE TABLE ${table}`),/permission denied/);
        await assert.rejects(c.query(`CREATE TRIGGER fixture_permission_probe BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION public.fixture_permission_probe()`),/permission denied/);
        await assert.rejects(c.query(`ALTER TABLE public.fixture_reference_probe_${role} ADD CONSTRAINT fixture_reference_probe FOREIGN KEY(reference_id) REFERENCES ${table}(id)`),/permission denied/);
      }
    },role);
    const after=await Promise.all(tables.map(async name=>(await admin.query(`SELECT count(*)::int AS n FROM ${name}`)).rows[0].n));
    assert.deepEqual(after,before);
  } finally {
    for(const table of tables) await admin.query(`DROP TRIGGER IF EXISTS fixture_permission_probe ON ${table}`);
    for(const role of ['anon','authenticated','service_role']) await admin.query(`DROP TABLE public.fixture_reference_probe_${role}`);
    await admin.query('DROP FUNCTION public.fixture_permission_probe()');
  }
});
