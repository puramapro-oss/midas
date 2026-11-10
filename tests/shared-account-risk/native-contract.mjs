// Native PostgreSQL only. Every account, identity, observation and amount is
// synthetic. Private loopback cluster, no broker and no external database.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { withPrivatePostgres } from './private-postgres.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SharedAccountRisk } from '../../src/lib/trading/shared-account-risk.ts';

const runtime = process.env.SHARED_RISK_PG_RUNTIME;
const evidence = process.env.SHARED_RISK_EVIDENCE;
assert(runtime && evidence, 'Explicit private fixture runtime and evidence directory required');
const migration = await readFile(new URL('../../supabase/migrations/20261110190000_shared_account_risk.sql', import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const checks = [];
const filter = process.env.SHARED_RISK_TEST_FILTER ? new RegExp(process.env.SHARED_RISK_TEST_FILTER) : null;
const skipped = [];
const startedAt = new Date().toISOString();
async function check(name, action) {
  if (filter && name !== 'actual migration compiles on native PostgreSQL' && !filter.test(name)) {
    skipped.push(name); return;
  }
  const at = Date.now();
  try { await action(); checks.push({ name, status: 'PASS', milliseconds: Date.now() - at }); }
  catch (error) { checks.push({ name, status: 'FAIL', error: error.message }); throw error; }
  console.log(`PASS ${name}`);
}
let metrics = {};
try {
  await withPrivatePostgres(async ({ pg, connection, dataDirectory }) => {
    const clients = new Set();
    async function connect(role) {
      const c = new pg.Client(connection); await c.connect(); clients.add(c);
      if (role) await c.query(`SET ROLE ${role}`);
      return c;
    }
    async function end(c) { clients.delete(c); await c.end(); }
    let admin = await connect();
    const service = await connect();
    try {
      await admin.query('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role');
      await check('actual migration compiles on native PostgreSQL', () => admin.query(migration));
      await service.query('SET ROLE service_role');
      async function request(c, name, args) {
        const sql = {
          observe: 'SELECT public.purama_shared_risk_observe($1,$2,$3) AS result',
          reserve: 'SELECT public.purama_shared_risk_reserve($1,$2,$3,$4) AS result',
          transition: 'SELECT public.purama_shared_risk_transition($1,$2,$3,$4,$5,$6) AS result',
        }[name];
        return (await c.query(sql, args)).rows[0].result;
      }
      async function observation(a, changes = {}) {
        const clock = (await admin.query("SELECT extract(epoch FROM clock_timestamp())::text AS at, extract(epoch FROM date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::text AS day")).rows[0];
        return { binding_hash: a.binding, currency: 'USD', authenticated: true, complete: true,
          synchronized: true, cashflows_verified: true, all_writers_observed: true,
          daily_reference_verified: true, equity_basis: 'RAW_BROKER_INCLUDING_CREDIT',
          cashflow_basis: 'EXCLUDING_PROMOTIONAL_CREDIT_MOVEMENTS', at: clock.at,
          day_start_at: clock.day, equity: '105', credit: '5', day_start_equity: '105',
          day_start_credit: '5', net_cashflows: '0', realized_loss: '0', free_margin: '105',
          positions: [], orders: [], reconciliations: [], ...changes };
      }
      async function observe(a, changes = {}) {
        const data = await observation(a, changes);
        const result = await request(service, 'observe', [a.key,a.id,data]);
        if (result.status === 'OBSERVED') a.snapshot = result.snapshot_hash;
        return result;
      }
      async function account(enabled = true) {
        const a = { key: hash(randomUUID()), id: randomUUID(), binding: hash(randomUUID()) };
        await admin.query('INSERT INTO public.shared_account_risk_accounts(account_key,authority_id,binding_hash,currency,writers) VALUES ($1,$2,$3,$4,$5)', [a.key,a.id,a.binding,'USD',['jev','midas']]);
        assert.equal((await observe(a)).status, 'OBSERVED');
        if (enabled) await admin.query('UPDATE public.shared_account_risk_accounts SET admission_enabled=true WHERE account_key=$1', [a.key]);
        return a;
      }
      function intent(a, changes = {}) {
        return { operation_id: randomUUID(), intent_hash: hash(randomUUID()), costs_hash: hash('synthetic costs'),
          snapshot_hash: a.snapshot, currency: 'USD', loss: '0.4', margin: '3', ...changes };
      }
      const reserve = (a, data, writer='jev', c=service) => request(c,'reserve',[a.key,a.id,writer,data]);
      const transition = (a, r, target, c=service) => request(c,'transition',[a.key,a.id,r.writer,r.operation_id,r.fencing,target]);
      const rows = async a => (await admin.query('SELECT * FROM public.shared_account_risk_reservations WHERE account_key=$1 ORDER BY fencing',[a.key])).rows;
      const ticket = changes => ({ ticket_hash: hash(randomUUID()), verified: true, risk_includes_costs: true,
        remaining_risk: '0.3', position_risk: '0.3', cost_reserve: '0.01', additional_margin: '0', ...changes });
      async function executionProof(a,r,brokerOrderHash,changes={}) {
        return {operation_id:r.operation_id,intent_hash:r.intent_hash,fencing:r.fencing,
          broker_order_hash:brokerOrderHash,observed_at:(await observation(a)).at,
          fills_complete:true,remainder_terminal:true,terminal_order_state:'FILLED',
          executable_remaining_quantity:'0',...changes};
      }

      await check('default admission stays locked despite a complete observation', async () => {
        const a = await account(false);
        await assert.rejects(reserve(a,intent(a)), /LOCKED_OR_STALE/);
        assert.equal((await rows(a)).length,0);
      });
      await check('canonical physical account binding cannot be enrolled under a second budget', async () => {
        const a=await account();
        await assert.rejects(admin.query('INSERT INTO public.shared_account_risk_accounts(account_key,authority_id,binding_hash,currency,writers) VALUES ($1,$2,$3,$4,$5)',
          [hash('different account key'),randomUUID(),a.binding,'USD',['jev','midas']]),
          error=>error.code==='23505' && /binding_hash/.test(error.constraint));
        assert.equal((await admin.query('SELECT count(*)::int AS count FROM public.shared_account_risk_accounts WHERE binding_hash=$1',[a.binding])).rows[0].count,1);
        metrics.duplicatePhysicalAccountEnrollmentRejected=true;
      });
      await check('1 percent per position and shared daily budget use equity excluding credit once', async () => {
        const a = await account();
        await assert.rejects(reserve(a,intent(a,{loss:'1.01'})), /POSITION_LIMIT/);
        await reserve(a,intent(a,{loss:'0.6'}),'jev');
        await reserve(a,intent(a,{loss:'0.4'}),'midas');
        await assert.rejects(reserve(a,intent(a,{loss:'0.000000000001'})), /DAILY_LIMIT/);
        assert.equal((await rows(a)).length,2);
        const b = await account();
        await observe(b,{equity:'205',credit:'105'});
        await assert.rejects(reserve(b,intent(b,{loss:'1.01'})), /POSITION_LIMIT/);
      });
      await check('both existing positions and pending orders consume allowance and margin', async () => {
        for (const collection of ['positions','orders']) {
          const a = await account();
          assert.equal((await observe(a,{[collection]:[ticket({remaining_risk:'0.7',position_risk:'0.7'})]})).status,'OBSERVED');
          await assert.rejects(reserve(a,intent(a)),/DAILY_LIMIT/);
          await observe(a,{orders:[ticket({additional_margin:'98'})]});
          await assert.rejects(reserve(a,intent(a)),/MARGIN_LIMIT/);
          await observe(a,{[collection]:[ticket({position_risk:'1.01'})]});
          await assert.rejects(reserve(a,intent(a,{loss:'0.1'})),/POSITION_LIMIT/);
        }
      });
      await check('deposits and profits do not enlarge or replenish the daily loss budget', async () => {
        const a = await account();
        await observe(a,{equity:'205',net_cashflows:'100'});
        await assert.rejects(reserve(a,intent(a,{loss:'1.1'})),/DAILY_LIMIT/);
        await observe(a,{equity:'110',realized_loss:'0.7'});
        await assert.rejects(reserve(a,intent(a)),/DAILY_LIMIT/);
        await observe(a,{equity:'110',realized_loss:'0'});
        await assert.rejects(reserve(a,intent(a)),/DAILY_LIMIT/);
        assert.equal((await admin.query('SELECT realized_loss::text AS loss FROM public.shared_account_risk_days WHERE account_key=$1',[a.key])).rows[0].loss,'0.7');
        metrics.persistedRealizedLoss='0.7';
        await observe(a,{equity:'104.5'});
        await assert.rejects(reserve(a,intent(a,{loss:'0.5'})),/DAILY_LIMIT/);
      });
      await check('idempotent replay and permanent logical intent claim survive release', async () => {
        const a = await account(); const data = intent(a); const first = await reserve(a,data);
        const again = await reserve(a,data); assert.equal(again.applied,false); assert.equal(again.fencing,first.fencing);
        await assert.rejects(reserve(a,{...data,loss:'0.3'}),/IDEMPOTENCY_CONFLICT/);
        await assert.rejects(reserve(a,{...data,operation_id:randomUUID()},'midas'),/INTENT_ALREADY_CLAIMED/);
        const ended = await transition(a,first,'CANCELLED_UNSENT'); assert.equal(ended.state,'RELEASED');
        assert.equal((await reserve(a,data)).state,'RELEASED');
        await assert.rejects(reserve(a,{...data,operation_id:randomUUID()},'midas'),/INTENT_ALREADY_CLAIMED/);
        assert.equal(first.execution_authority,false); assert.equal(first.live_release,'LOCKED');
      });
      await check('invalid evidence never becomes zero risk and invalidates the previous observation', async () => {
        for (const change of [ {orders:null}, {complete:false}, {credit:'NaN'}, {realized_loss: true},
          {positions:[ticket({remaining_risk:null})]}, {currency:'EUR'}, {at:'1'},
          {day_start_equity:'106'}, {binding_hash:hash('wrong binding')} ]) {
          const a = await account();
          assert.equal((await observe(a,change)).status,'BLOCKED');
          await assert.rejects(reserve(a,intent(a)),/LOCKED_OR_STALE/);
          assert.equal((await rows(a)).length,0);
        }
      });
      await check('all-in ticket risk includes costs exactly once and cannot omit them', async () => {
        const a=await account();
        await observe(a,{positions:[ticket({remaining_risk:'0.6',position_risk:'0.6',cost_reserve:'0.2'})]});
        assert.equal((await reserve(a,intent(a,{loss:'0.4'}))).state,'RESERVED');
        for(const change of [{risk_includes_costs:false},{remaining_risk:'0.1',cost_reserve:'0.2'},
          {position_risk:'0.1',cost_reserve:'0.2'}]) {
          const b=await account(); assert.equal((await observe(b,{positions:[ticket(change)]})).status,'BLOCKED');
          await assert.rejects(reserve(b,intent(b)),/LOCKED_OR_STALE/);
        }
      });
      await check('an incomplete, duplicate or unexpected writer enrollment stays closed', async () => {
        for(const writers of [['jev'],['midas'],['jev','jev'],['jev','midas','unknown'],[]]) {
          const a=await account(); const r=await reserve(a,intent(a));
          await admin.query('UPDATE public.shared_account_risk_accounts SET writers=$2 WHERE account_key=$1',[a.key,writers]);
          await assert.rejects(reserve(a,intent(a)),/BINDING_REQUIRED/);
          await assert.rejects(transition(a,r,'SUBMITTING'),/BINDING_REQUIRED/);
        }
      });
      await check('actual TypeScript adapter calls the native PostgreSQL RPC contract', async () => {
        const a=await account(); const calls=[];
        const api=new SharedAccountRisk({account_key:a.key,authority_id:a.id,writer:'midas',currency:'USD'},
          async(name,p)=>{
            calls.push(name);
            const data=name==='purama_shared_risk_reserve'
              ?await request(service,'reserve',[p.p_account_key,p.p_authority_id,p.p_writer,p.p_request])
              :await request(service,'transition',[p.p_account_key,p.p_authority_id,p.p_writer,p.p_operation_id,p.p_fencing,p.p_target]);
            return {data,error:null};
          });
        const data=intent(a); delete data.currency;
        const r=await api.reserve(data); assert.equal(r.applied,true);
        assert.equal((await api.reserve(data)).applied,false);
        assert.equal((await api.transition(r.operation_id,r.fencing,'SUBMITTING')).state,'SUBMITTING');
        assert.equal((await api.transition(r.operation_id,r.fencing,'UNKNOWN')).state,'UNKNOWN');
        assert.equal(calls.length,4); assert.equal((await rows(a))[0].state,'UNKNOWN');
      });
      await check('anonymous and authenticated clients cannot call or modify capacity state', async () => {
        const a = await account();
        for (const role of ['anon','authenticated']) {
          const c = await connect(role);
          try {
            await assert.rejects(reserve(a,intent(a),'jev',c),/permission denied/);
            await assert.rejects(c.query('SELECT * FROM public.shared_account_risk_accounts'),/permission denied/);
            await assert.rejects(c.query('UPDATE public.shared_account_risk_reservations SET state=\'RELEASED\''),/permission denied/);
          } finally { await end(c); }
        }
        await assert.rejects(service.query('UPDATE public.shared_account_risk_accounts SET admission_enabled=true'),/permission denied/);
        await assert.rejects(request(service,'reserve',[a.key,randomUUID(),'jev',intent(a)]),/BINDING_REQUIRED/);
        await assert.rejects(reserve(a,intent(a),'unbound-writer'),/BINDING_REQUIRED/);
      });
      await check('real 12-session concurrency admits only the shared decimal capacity', async () => {
        const a = await account();
        const sessions = await Promise.all(Array.from({length:12},()=>connect('service_role')));
        try {
          const pids = await Promise.all(sessions.map(c=>c.query('SELECT pg_backend_pid() AS pid')));
          assert.equal(new Set(pids.map(r=>r.rows[0].pid)).size,12);
          const results = await Promise.allSettled(sessions.map((c,i)=>reserve(a,intent(a,{loss:'0.15'}),i%2?'midas':'jev',c)));
          assert.equal(results.filter(r=>r.status==='fulfilled').length,6);
          for (const r of results.filter(r=>r.status==='rejected')) assert.match(r.reason.message,/DAILY_LIMIT/);
          const state = await rows(a); assert.equal(state.length,6);
          assert.equal((await admin.query('SELECT sum(loss)::text AS loss FROM public.shared_account_risk_reservations WHERE account_key=$1',[a.key])).rows[0].loss,'0.90');
          metrics.concurrentSessions=12; metrics.admitted=6; metrics.denied=6;
        } finally { await Promise.all(sessions.map(end)); }
      });
      await check('simultaneous exact retry claims one operation and one permanent intent', async () => {
        const a = await account(); const data = intent(a);
        const c1 = await connect('service_role'); const c2 = await connect('service_role');
        try {
          const results=await Promise.all([reserve(a,data,'jev',c1),reserve(a,data,'jev',c2)]);
          assert.deepEqual(results.map(x=>x.applied).sort(),[false,true]);
          assert.equal(results[0].fencing,results[1].fencing); assert.equal((await rows(a)).length,1);
        } finally { await end(c1); await end(c2); }
      });
      await check('waiting writer sees rollback with a real PostgreSQL row lock', async () => {
        const a = await account(); const c1=await connect('service_role'); const c2=await connect('service_role');
        try {
          await c1.query('BEGIN'); await reserve(a,intent(a,{loss:'0.8'}),'jev',c1);
          const pid=(await c2.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
          const pending=reserve(a,intent(a,{loss:'0.8'}),'midas',c2);
          let blocked=false;
          for(let i=0;i<50;i++) {
            blocked=(await admin.query('SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked',[pid])).rows[0].blocked;
            if(blocked) break;
            await new Promise(resolve=>setTimeout(resolve,10));
          }
          assert(blocked,'Second backend must actually wait on the account lock');
          await c1.query('ROLLBACK'); assert.equal((await pending).state,'RESERVED');
          assert.equal((await rows(a)).length,1); metrics.lockWaitObserved=true;
        } finally { await c1.query('ROLLBACK'); await end(c1); await end(c2); }
      });
      await check('repeatable-read snapshots are refused before admission and transition', async () => {
        const a=await account(); const r=await reserve(a,intent(a));
        const c=await connect('service_role');
        try {
          for(const call of [()=>reserve(a,intent(a),'jev',c),()=>transition(a,r,'SUBMITTING',c)]) {
            await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
            await assert.rejects(call(),/READ_COMMITTED_REQUIRED/); await c.query('ROLLBACK');
          }
        } finally { await c.query('ROLLBACK'); await end(c); }
      });
      await check('submitted and unknown reservations cannot expire or release on a timeout', async () => {
        const a=await account(); const r=await reserve(a,intent(a));
        assert.equal((await transition(a,r,'SUBMITTING')).applied,true);
        assert.equal((await transition(a,r,'SUBMITTING')).applied,false);
        await assert.rejects(reserve(a,intent(a,{loss:'0.1'})),/UNCERTAIN_ACCOUNT/);
        await transition(a,r,'UNKNOWN');
        await assert.rejects(transition(a,r,'CANCELLED_UNSENT'),/TRANSITION_INVALID/);
        await assert.rejects(transition(a,r,'RELEASED'),/TRANSITION_INVALID/);
        await admin.query("UPDATE public.shared_account_risk_reservations SET created_at=clock_timestamp()-interval '3 days',submitted_at=clock_timestamp()-interval '3 days' WHERE operation_id=$1",[r.operation_id]);
        await observe(a); await assert.rejects(reserve(a,intent(a,{loss:'0.1'})),/UNCERTAIN_ACCOUNT/);
        assert.equal((await rows(a))[0].state,'UNKNOWN');
      });
      await check('reconciliation requires a complete newer observation and accounted ticket or terminal proof', async () => {
        const a=await account(); const r=await reserve(a,intent(a)); await transition(a,r,'SUBMITTING');
        const proof={operation_id:r.operation_id,intent_hash:r.intent_hash,proof_hash:hash('verified fixture reconciliation'),verified:true,outcome:'ACCOUNTED_IN_SNAPSHOT'};
        assert.equal((await observe(a,{reconciliations:[proof]})).status,'BLOCKED');
        assert.equal((await rows(a))[0].state,'SUBMITTING');
        assert.equal((await observe(a,{reconciliations:[{...proof,outcome:'TERMINAL_CONFIRMED'}]})).status,'BLOCKED');
        const orderHash=hash('complete initial order');
        const position=ticket({operation_id:r.operation_id,intent_hash:r.intent_hash,broker_order_hash:orderHash,
          remaining_risk:'0.8',position_risk:'0.8'});
        proof.execution_proof=await executionProof(a,r,orderHash);
        assert.equal((await observe(a,{positions:[position],reconciliations:[proof]})).status,'OBSERVED');
        assert.equal((await rows(a))[0].state,'RELEASED');
        await assert.rejects(reserve(a,intent(a)),/DAILY_LIMIT/);
        assert.equal((await reserve(a,intent(a,{loss:'0.1'}))).state,'RESERVED');
      });
      await check('partial reconciliation cannot release an unknown unproven remainder', async () => {
        const a=await account(); const data=intent(a,{loss:'0.8'}); const r=await reserve(a,data);
        await transition(a,r,'SUBMITTING'); await transition(a,r,'UNKNOWN');
        const position=ticket({operation_id:r.operation_id,intent_hash:r.intent_hash,
          broker_order_hash:hash('partial initial order'),remaining_risk:'0.2',position_risk:'0.2'});
        const proof={operation_id:r.operation_id,intent_hash:r.intent_hash,
          proof_hash:hash('snapshot only, no final remainder proof'),verified:true,outcome:'ACCOUNTED_IN_SNAPSHOT'};
        const observed=await observe(a,{positions:[position],reconciliations:[proof]});
        const durable=await rows(a);
        let next;
        try { next=await reserve(a,intent(a,{loss:'0.8'}),'midas'); }
        catch(error) { next={blocked:true,message:error.message}; }
        metrics.partialReconciliation={observationStatus:observed.status,heldState:durable[0].state,
          heldLoss:durable[0].loss,newRiskAdmitted:next.state==='RESERVED'};
        assert.equal(observed.status,'BLOCKED');
        assert.equal(durable[0].state,'UNKNOWN'); assert.equal(durable[0].loss,'0.8');
        assert.equal(next.blocked,true);
      });
      await check('partial reconciliation rejects incomplete, foreign, contradictory or out-of-window execution proofs', async () => {
        const cases=[
          ['missing fills completeness',{fills_complete:undefined}],
          ['string fills completeness',{fills_complete:'true'}],
          ['unknown remainder',{remainder_terminal:false}],
          ['string remainder',{remainder_terminal:'true'}],
          ['nonzero executable remainder',{executable_remaining_quantity:'0.6'}],
          ['missing executable remainder',{executable_remaining_quantity:undefined}],
          ['foreign operation',{operation_id:randomUUID()}],
          ['foreign intent',{intent_hash:hash('other intent')}],
          ['wrong fencing',{fencing:'999999'}],
          ['numeric fencing',{fencing:1}],
          ['wrong broker order',{broker_order_hash:hash('other order')}],
          ['before submission',{observed_at:'1'}],
          ['after snapshot',{observed_at:'9999999999'}],
          ['rejected order with a position',{terminal_order_state:'REJECTED'}],
          ['still partially filled',{terminal_order_state:'PARTIALLY_FILLED'}],
          ['missing ticket provenance',{},'missing-provenance'],
          ['pending order alone',{},'pending-only'],
          ['position plus active pending remainder',{},'pending-remainder'],
        ];
        for(const [name,changes,variant] of cases) {
          const a=await account(); const r=await reserve(a,intent(a,{loss:'0.8'}));
          await transition(a,r,'SUBMITTING'); await transition(a,r,'UNKNOWN');
          const orderHash=hash('initial order '+name);
          const position=ticket({operation_id:r.operation_id,intent_hash:r.intent_hash,broker_order_hash:orderHash,
            remaining_risk:'0.2',position_risk:'0.2'});
          if(variant==='missing-provenance') delete position.broker_order_hash;
          const proof={operation_id:r.operation_id,intent_hash:r.intent_hash,proof_hash:hash(name),
            verified:true,outcome:'ACCOUNTED_IN_SNAPSHOT',execution_proof:await executionProof(a,r,orderHash,changes)};
          const positions=variant==='pending-only'?[]:[position];
          const orders=['pending-only','pending-remainder'].includes(variant)?[{...position,ticket_hash:hash('pending '+name),additional_margin:'1'}]:[];
          assert.equal((await observe(a,{positions,orders,reconciliations:[proof]})).status,'BLOCKED',name);
          const durable=await rows(a); assert.equal(durable[0].state,'UNKNOWN',name);
          assert.equal(durable[0].loss,'0.8',name);
          await assert.rejects(reserve(a,intent(a,{loss:'0.8'})),/LOCKED_OR_STALE/,name);
        }
        metrics.rejectedIncompleteExecutionProofCases=cases.length;
      });
      await check('partial reconciliation releases only after proved terminal remainder and accounts for remaining position risk', async () => {
        for(const state of ['FILLED','CANCELLED','EXPIRED']) {
          const a=await account(); const r=await reserve(a,intent(a,{loss:'0.8'}));
          await transition(a,r,'SUBMITTING'); await transition(a,r,'UNKNOWN');
          const orderHash=hash('terminal partial '+state);
          const position=ticket({operation_id:r.operation_id,intent_hash:r.intent_hash,broker_order_hash:orderHash,
            remaining_risk:'0.2',position_risk:'0.2'});
          const proof={operation_id:r.operation_id,intent_hash:r.intent_hash,proof_hash:hash('complete evidence '+state),
            verified:true,outcome:'ACCOUNTED_IN_SNAPSHOT',execution_proof:await executionProof(a,r,orderHash,{terminal_order_state:state})};
          assert.equal((await observe(a,{positions:[position],reconciliations:[proof]})).status,'OBSERVED');
          assert.equal((await rows(a))[0].state,'RELEASED');
          assert.equal((await reserve(a,intent(a,{loss:'0.8'}),'midas')).state,'RESERVED');
          await assert.rejects(reserve(a,intent(a,{loss:'0.0001'})),/DAILY_LIMIT/);
        }
        metrics.provedTerminalRemainderCases=3;
      });
      await check('terminal reconciliation requires complete closed fills and retains realized losses', async () => {
        const a=await account(); const r=await reserve(a,intent(a,{loss:'0.8'}));
        await transition(a,r,'SUBMITTING'); await transition(a,r,'UNKNOWN');
        const orderHash=hash('closed initial order');
        const proof={operation_id:r.operation_id,intent_hash:r.intent_hash,proof_hash:hash('complete closed history'),
          verified:true,outcome:'TERMINAL_CONFIRMED',terminal:true,
          execution_proof:await executionProof(a,r,orderHash,{terminal_order_state:'CANCELLED'})};
        assert.equal((await observe(a,{realized_loss:'0.3',reconciliations:[proof]})).status,'BLOCKED');
        assert.equal((await rows(a))[0].state,'UNKNOWN');
        proof.execution_proof.all_fills_closed=true;
        assert.equal((await observe(a,{realized_loss:'0.3',reconciliations:[proof]})).status,'OBSERVED');
        assert.equal((await rows(a))[0].state,'RELEASED');
        await assert.rejects(reserve(a,intent(a,{loss:'0.8'})),/DAILY_LIMIT/);
        await observe(a,{realized_loss:'0'});
        assert.equal((await admin.query('SELECT realized_loss::text AS loss FROM public.shared_account_risk_days WHERE account_key=$1',[a.key])).rows[0].loss,'0.3');
        assert.equal((await reserve(a,intent(a,{loss:'0.7'}))).state,'RESERVED');
      });
      await check('realized high-water survives regression while latent risk can decrease', async () => {
        const a=await account();
        const position=ticket({remaining_risk:'0.4',position_risk:'0.4'});
        assert.equal((await observe(a,{positions:[position],realized_loss:'0.3'})).status,'OBSERVED');
        await assert.rejects(reserve(a,intent(a,{loss:'0.4'})),/DAILY_LIMIT/);
        assert.equal((await observe(a,{positions:[{...position,remaining_risk:'0.1',position_risk:'0.1'}],realized_loss:'0'})).status,'OBSERVED');
        const state=(await admin.query('SELECT a.existing_risk::text, a.daily_loss::text, d.realized_loss::text FROM public.shared_account_risk_accounts a JOIN public.shared_account_risk_days d USING(account_key) WHERE a.account_key=$1',[a.key])).rows[0];
        assert.deepEqual(state,{existing_risk:'0.1',daily_loss:'0.3',realized_loss:'0.3'});
        assert.equal((await reserve(a,intent(a,{loss:'0.6'}))).state,'RESERVED');
        await assert.rejects(reserve(a,intent(a,{loss:'0.0001'})),/DAILY_LIMIT/);
        metrics.realizedVersusLatent=state;
      });
      await check('SUBMITTING revalidates reduced capital and never frees a denied reservation', async () => {
        const a=await account(); const r=await reserve(a,intent(a,{loss:'0.8'}));
        await observe(a,{equity:'104.6'});
        await assert.rejects(transition(a,r,'SUBMITTING'),/REVALIDATION_REQUIRED/);
        assert.equal((await rows(a))[0].state,'RESERVED');
      });
      await check('committed submission and permanent intent survive an immediate PostgreSQL restart', async () => {
        const a=await account(); const data=intent(a); const r=await reserve(a,data);
        await transition(a,r,'SUBMITTING');
        await Promise.all([...clients].map(end));
        await promisify(execFile)(`${runtime}/node_modules/@embedded-postgres/linux-x64/native/bin/pg_ctl`,
          ['-D',dataDirectory,'-l',`${dataDirectory}/../server.log`,'-m','immediate','-w','-t','15','restart'], {timeout:25000,maxBuffer:1024*1024});
        admin=await connect(); const recovered=await connect('service_role');
        try {
          const receipt=await reserve(a,data,'jev',recovered);
          assert.equal(receipt.state,'SUBMITTING'); assert.equal(receipt.applied,false);
          assert.equal(receipt.fencing,r.fencing);
          await assert.rejects(reserve(a,intent(a,{loss:'0.1'}),'midas',recovered),/UNCERTAIN_ACCOUNT/);
          await assert.rejects(transition(a,r,'CANCELLED_UNSENT',recovered),/TRANSITION_INVALID/);
          metrics.immediateRestartVerified=true;
        } finally { await end(recovered); }
      });
      return { checks:checks.length, metrics, migrationSha256:hash(migration) };
    } finally { await Promise.all([...clients].map(end)); }
  }, { evidencePath:`${evidence}/native-runtime.json`, runtimeDirectory:runtime });
} finally {
  await writeFile(`${evidence}/native-results.json`,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),
    checks,metrics,filter:filter?.source??null,skipped,migrationSha256:hash(migration),scope:'Synthetic native PostgreSQL; no broker, no hosted migration, no production authentication qualification'},null,2)+'\n');
}
