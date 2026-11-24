// Actual TypeScript handlers with an explicit, closed dependency boundary.
// DB behavior here tests application composition only; native PostgreSQL tests
// separately establish row locks, rollback, grants and journal persistence.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const zod = require('zod');
const root = fileURLToPath(new URL('../../', import.meta.url));
export const USER = '00000000-0000-4000-8000-000000000001';
export const KEY = '00000000-0000-4000-8000-000000000002';
export const LEGACY_ID = '00000000-0000-4000-8000-000000000003';
export const ACCOUNT = 'acct_fixture';
export const IBAN = 'DE89370400440532013000';

export function createFixture(options = {}) {
  const state = {
    balance: 100, legacyBalance: 80, debits: 0, refunds: 0, legacyRefunds: 0,
    user: { id: USER, email: 'matiss.frasne@gmail.com' },
    profile: { role: 'super_admin', phone_verified_at: '2026-01-01T00:00:00Z' },
    profileError: null, cap: 100_000, authCalls: 0, tableErrors: {}, walletAbsent: false,
    account: { user_id: USER, stripe_account_id: ACCOUNT, payouts_enabled: true, kyc_verified_at: '2026-01-01T00:00:00Z' },
    journal: new Map(), rpcCalls: [], stripeCalls: [], directWrites: [], notifications: [], clients: [],
    rpcErrors: {}, receiptOverrides: {}, directWriteErrors: new Set(),
    legacy: { id: LEGACY_ID, user_id: USER, amount: 20, iban: IBAN, status: 'pending', debitProof: true },
    legacyRequests: new Map(), legacyDebits: 0, walletTransactions: [],
    transferBehavior: null, nextId: 10, event: null, signatureInputs: [], nowMs: Date.UTC(2026, 10, 23),
    ...options.state,
  };
  if (state.legacy) state.legacyRequests.set(state.legacy.id, state.legacy);
  const sourceRoot = options.sourceRoot ?? process.env.MIDAS_WITHDRAWAL_SOURCE_ROOT ?? root;
  const receipt = (row, applied, credited = 0) => ({
    ...row, amount_eur: row.amount_eur.toFixed(2), ledger_version: 1,
    credited_reversal_eur: row.credited_reversal_eur.toFixed(2), credited_eur: credited.toFixed(2),
    wallet_balance: state.balance.toFixed(2), applied,
    admission_rejection: row.admission_rejection ?? null, rejection_recorded: Boolean(row.admission_rejection),
    debit_confirmed: !row.admission_rejection, refunded: credited > 0,
  });
  const walletReceipt = (row, applied) => ({
    id: row.id, user_id: row.user_id, amount: row.amount.toFixed(2), iban: row.iban, status: row.status,
    applied, debit_confirmed: row.debitProof, refunded: row.status === 'rejected' && !row.admission_rejection,
    rejection_recorded: Boolean(row.admission_rejection), admission_rejection: row.admission_rejection ?? null,
    wallet_balance: state.legacyBalance.toFixed(2),
  });
  const fail = message => ({ data: null, error: { message } });
  const ok = data => ({ data, error: null });

  async function rpc(schema, name, args) {
    state.rpcCalls.push({ schema, name, args: structuredClone(args) });
    // PostgreSQL uuid inputs have one lowercase representation, even when an
    // accepted HTTP UUID contains capital letters.
    args = Object.fromEntries(Object.entries(args).map(([key, value]) =>
      [key, ['p_user_id','p_request_key','p_request_id','p_withdrawal_id','p_admin_user_id'].includes(key) && typeof value === 'string' ? value.toLowerCase() : value]));
    if (state.rpcErrors[name]) return fail(state.rpcErrors[name]);
    let result;
    if (name === 'admit_connect_withdrawal') {
      const prior = [...state.journal.values()].find(row => row.user_id === args.p_user_id && row.request_key === args.p_request_key);
      if (prior) {
        if (prior.requested_amount_eur !== args.p_amount || prior.stripe_account_id !== args.p_destination) return fail('withdrawal_idempotency_conflict');
        result = receipt(prior, false);
      } else {
        if ([...state.journal.values()].some(row => row.user_id === args.p_user_id && !row.stripe_transfer_id && row.status === 'pending')) return fail('withdrawal_reconciliation_required');
        const amount = args.p_amount ?? state.balance;
        if (amount < 20 || amount > 100_000) return fail('withdrawal_invalid_amount');
        const rejection = amount > args.p_cap ? 'withdrawal_cap_exceeded' : amount > state.balance ? 'insufficient_balance' : null;
        const id = `00000000-0000-4000-8000-${String(state.nextId++).padStart(12, '0')}`;
        const row = {
          id, user_id: args.p_user_id, request_key: args.p_request_key,
          requested_amount_eur: args.p_amount, amount_eur: amount,
          stripe_account_id: args.p_destination, currency: 'eur', status: rejection ? 'failed' : 'pending', admission_rejection: rejection,
          stripe_transfer_id: null, provider_confirmed: false, credited_reversal_eur: 0,
        };
        state.journal.set(id, row); if (!rejection) { state.balance -= amount; state.debits++; }
        result = receipt(row, true);
      }
    } else if (name === 'reconcile_connect_withdrawal') {
      const row = state.journal.get(args.p_withdrawal_id);
      if (!row || row.admission_rejection) return fail('withdrawal_reconciliation_required');
      if (row.user_id !== args.p_user_id || row.amount_eur !== args.p_amount || row.stripe_account_id !== args.p_destination ||
          args.p_currency !== 'eur' || (row.stripe_transfer_id && row.stripe_transfer_id !== args.p_transfer_id)) return fail('withdrawal_receipt_mismatch');
      const total = Math.max(row.credited_reversal_eur, args.p_reversed_amount);
      const delta = total - row.credited_reversal_eur;
      state.balance += delta; state.refunds += delta;
      Object.assign(row, { stripe_transfer_id: args.p_transfer_id, provider_confirmed: true,
        credited_reversal_eur: total, status: total === row.amount_eur ? 'reversed' : 'pending' });
      result = receipt(row, delta > 0, delta);
    } else if (name === 'admit_wallet_withdrawal') {
      if (schema !== 'midas') return fail('PGRST202: RPC absent from the selected schema');
      const prior = state.legacyRequests.get(args.p_request_id);
      if (prior) {
        if (prior.user_id !== args.p_user_id || (args.p_amount !== null && (args.p_amount !== prior.amount || args.p_iban !== prior.iban))) return fail('withdrawal_idempotency_conflict');
        if (!prior.admission_rejection && !prior.debitProof) return fail('withdrawal_debit_proof_required');
        result = walletReceipt(prior, false);
      } else {
        if (args.p_amount === null || args.p_iban === null) return fail('withdrawal_request_not_found');
        let rejection = null;
        if ([...state.legacyRequests.values()].some(row => row.status === 'pending' && row.user_id === args.p_user_id)) rejection = 'withdrawal_pending';
        else if (state.profile?.subscription_started_at && new Date(state.profile.subscription_started_at).getTime() + 30 * 86400000 > state.nowMs) rejection = 'withdrawal_locked_30d';
        else if (args.p_amount > state.legacyBalance) rejection = 'insufficient_balance';
        const row = { id: args.p_request_id, user_id: args.p_user_id, amount: args.p_amount, iban: args.p_iban,
          status: rejection ? 'rejected' : 'pending', debitProof: !rejection, admission_rejection: rejection };
        state.legacyRequests.set(row.id, row);
        if (!rejection) { state.legacyBalance -= args.p_amount; state.legacyDebits++; }
        result = walletReceipt(row, true);
      }
    } else if (name === 'decide_wallet_withdrawal') {
      if (schema !== 'midas') return fail('PGRST202: RPC absent from the selected schema');
      const row = state.legacyRequests.get(args.p_withdrawal_id);
      if (!row) return fail('withdrawal_not_found');
      if (row.admission_rejection) return fail('withdrawal_not_admitted');
      if (!row.debitProof) return fail('withdrawal_debit_proof_required');
      const applied = row.status === 'pending';
      if (!applied && row.status !== args.p_action) return fail('withdrawal_decision_conflict');
      if (applied && args.p_action === 'rejected') {
        state.legacyBalance += row.amount; state.legacyRefunds++;
      }
      row.status = args.p_action;
      result = walletReceipt(row, applied);
    } else if (name === 'get_wallet_balance') {
      result = state.balance;
    } else if (name === 'debit_wallet_for_withdrawal') {
      if (args.p_amount > state.balance) return fail('insufficient_balance');
      state.balance -= args.p_amount; state.debits++; result = state.balance;
    } else if (name === 'credit_wallet_on_withdrawal_failure') {
      state.balance += args.p_amount; state.refunds += args.p_amount; result = state.balance;
    } else {
      throw new Error(`Unexpected RPC ${schema}.${name}`);
    }
    return ok(state.receiptOverrides[name] ? state.receiptOverrides[name](result) : result);
  }

  function table(name) {
    let action = 'select'; let data; let fields = ''; const filters = [];
    const execute = single => {
      if (action !== 'select') {
        state.directWrites.push({ table: name, action, data: structuredClone(data) });
        if (state.directWriteErrors.has(name)) return fail('simulated persistence failure');
        if (name === 'notifications') state.notifications.push(data);
        if (name === 'connect_withdrawals' && action === 'insert') {
          const id = `00000000-0000-4000-8000-${String(state.nextId++).padStart(12, '0')}`;
          state.journal.set(id, { id, currency: 'eur', ...data });
        }
        if (name === 'connect_withdrawals' && action === 'update') {
          for (const row of state.journal.values()) if (filters.every(([key, value]) => row[key] === value)) Object.assign(row, data);
        }
        if (name === 'withdrawal_requests' && action === 'insert') {
          const row = { id: `00000000-0000-4000-8000-${String(state.nextId++).padStart(12, '0')}`, status: 'pending', debitProof: false, ...data };
          state.legacy = row; state.legacyRequests.set(row.id, row); return ok(row);
        }
        if (name === 'withdrawal_requests' && action === 'update') {
          for (const row of state.legacyRequests.values()) if (filters.every(([key, value]) => row[key] === value)) Object.assign(row, data);
        }
        if (name === 'wallet_transactions') state.walletTransactions.push(data);
        if (name === 'wallets') {
          if (filters.some(([key, value]) => key === 'balance' && state.legacyBalance !== value)) return ok(null);
          state.legacyBalance = data.balance; return ok({ balance: state.legacyBalance });
        }
        return ok(null);
      }
      if (state.tableErrors[name]) return fail(state.tableErrors[name]);
      if (name === 'profiles') return state.profileError ? fail(state.profileError) : ok(state.profile);
      if (name === 'wallets') return ok(state.walletAbsent ? null : { user_id: USER, balance: state.legacyBalance, currency: 'EUR' });
      if (name === 'wallet_transactions') return ok(state.walletTransactions);
      if (name === 'connect_accounts') return ok(state.account);
      if (name === 'withdrawal_requests') {
        const rows = [...state.legacyRequests.values()].filter(row => filters.every(([key, value]) => row[key] === value));
        return ok(single ? rows[0] ?? null : rows);
      }
      if (name === 'connect_withdrawals') {
        const rows = [...state.journal.values()].filter(row => filters.every(([key, value]) => row[key] === value));
        return ok(single ? rows[0] ?? null : rows);
      }
      throw new Error(`Unexpected table read ${name} (${fields})`);
    };
    const chain = {
      select(value) { fields = value; return chain; },
      eq(key, value) { filters.push([key, value]); return chain; },
      update(value) { action = 'update'; data = value; return chain; },
      insert(value) { action = 'insert'; data = value; return chain; },
      order() { return chain; }, limit() { return chain; },
      async single() { return execute(true); }, async maybeSingle() { return execute(true); },
      then(resolve, reject) { return Promise.resolve().then(() => execute(false)).then(resolve, reject); },
    };
    return chain;
  }

  function client(settings = {}, kind = 'service') {
    const schema = settings.db?.schema ?? 'public'; state.clients.push({ kind, schema });
    return {
      auth: { async getUser() { state.authCalls++; return { data: { user: state.user }, error: null }; } },
      from: table, rpc: (name, args) => rpc(schema, name, args),
    };
  }
  const transferred = new Map();
  const stripe = {
    transfers: { async create(input, settings = {}) {
      state.stripeCalls.push({ input: structuredClone(input), settings: structuredClone(settings) });
      if (state.transferBehavior) return state.transferBehavior(input, settings);
      if (transferred.has(settings.idempotencyKey)) return transferred.get(settings.idempotencyKey);
      const transfer = { object: 'transfer', id: `tr_fixture${transferred.size + 1}`, amount_reversed: 0, reversed: false, ...input };
      transferred.set(settings.idempotencyKey, transfer); return transfer;
    } },
    webhooks: { constructEvent(raw, signature, secret) {
      state.signatureInputs.push({ raw, signature, secret });
      if (signature !== 'fixture-valid-signature') throw new Error('invalid simulated signature');
      return state.event ?? JSON.parse(raw);
    } },
  };
  const cache = new Map();
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative).exports;
    const filename = path.join(sourceRoot, relative);
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, { fileName: filename, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } });
    const module = { exports: {} }; cache.set(relative, module);
    function dependency(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === 'next/headers') return { cookies: async () => ({ getAll: () => [], set: () => {} }) };
      if (name === '@supabase/ssr') return { createServerClient: (_url, _key, settings) => client(settings, 'auth') };
      if (name === '@supabase/supabase-js') return { createClient: (_url, _key, settings) => client(settings) };
      if (name === 'zod') return zod;
      if (name === '@/lib/stripe/connect') return { getConnectAccountRow: async () => state.account, syncConnectAccount: async () => state.account };
      if (name === '@/lib/stripe/helpers') return { getStripe: () => stripe, getAdminSupabase: () => client() };
      if (name === '@/lib/antifraud-helpers') return {
        detectCollusionClusters: async () => [], computeMidasTrustTier: async () => ({ withdrawalCapEuros: state.cap, label: 'Fixture', tier: 3, nextTierRequirements: [] }),
      };
      if (name === '@/lib/phase') return options.cashAvailable ? { isWithdrawalAvailable: () => true } : load('src/lib/phase.ts');
      if (name === '@/lib/stripe/withdrawal-receipt') return load('src/lib/stripe/withdrawal-receipt.ts');
      if (name === '@/lib/wallet-withdrawal') return load('src/lib/wallet-withdrawal.ts');
      if (name === '@/lib/iban' || name === './iban') return load('src/lib/iban.ts');
      if (name === './handlers-connect') return load('src/app/api/stripe/webhook/handlers-connect.ts');
      if (['./handlers-payment', './handlers-subscription'].includes(name)) return new Proxy({}, { get() { return async () => { throw new Error('Unrelated webhook handler invoked'); }; } });
      throw new Error(`Unmocked dependency forbidden: ${name}`);
    }
    const run = vm.runInNewContext(`(function(require,module,exports){${compiled.outputText}\n})`, {
      Response, Request, URL, crypto: webcrypto, console,
      Date: class extends Date { constructor(value) { super(value ?? state.nowMs); } static now() { return state.nowMs; } },
      process: { env: { STRIPE_WEBHOOK_SECRET: 'whsec_local_fixture_only' } },
      fetch: () => { throw new Error('Network forbidden in withdrawal handler tests'); },
    }, { filename, timeout: 5000 });
    run(dependency, module, module.exports);
    return module.exports;
  }

  return { state, load,
    post: body => load('src/app/api/connect/withdraw/route.ts').POST(new Request('http://127.0.0.1/api/connect/withdraw', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })),
    patch: body => load('src/app/api/admin/withdrawals/route.ts').PATCH(new Request('http://127.0.0.1/api/admin/withdrawals', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })),
    walletPost: body => load('src/app/api/wallet/withdraw/route.ts').POST(new Request('http://127.0.0.1/api/wallet/withdraw', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })),
    webhook: (event, signature = 'fixture-valid-signature') => load('src/app/api/stripe/webhook/route.ts').POST(new Request('http://127.0.0.1/api/stripe/webhook', {
      method: 'POST', headers: { 'stripe-signature': signature }, body: JSON.stringify(event),
    })),
  };
}

export function withdrawalBody(changes = {}) {
  return { amount_eur: 20, idempotencyKey: KEY, expectedUserId: USER, expectedAccountId: ACCOUNT, ...changes };
}

export function transferFor(state, changes = {}) {
  const row = [...state.journal.values()][0];
  return { object: 'transfer', id: row.stripe_transfer_id ?? 'tr_fixture1', amount: row.amount_eur * 100,
    currency: 'eur', destination: row.stripe_account_id, amount_reversed: 0, reversed: false,
    metadata: { app: 'midas', source: 'connect_withdraw', user_id: row.user_id, withdrawal_id: row.id }, ...changes };
}
