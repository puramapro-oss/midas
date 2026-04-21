// =============================================================================
// MIDAS — dispatchKarmaSplit unit tests (V4.1 Axe 2)
// Mock Supabase en mémoire. Couvre 7 cas : 3 skips, 1 ok, 1 idempotent,
// 1 erreur RPC, 1 invoice sans amount_paid.
// =============================================================================

import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { dispatchKarmaSplit } from '../src/lib/karma/dispatch';

// ---------------------------------------------------------------------------
// In-memory Supabase mock (minimal, suffisant pour dispatchKarmaSplit)
// ---------------------------------------------------------------------------

interface MockState {
  karma_split_log: Array<Record<string, unknown> & { id: string }>;
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  /** Contrôle la valeur retournée par l'appel karma_split_apply. */
  rpcResponse: {
    data?: Array<{ log_id: string; pool_tx_ids: string[]; already_processed: boolean }>;
    error?: { message: string } | null;
  };
}

function uuid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeMock(init: Partial<MockState> = {}): {
  client: SupabaseClient;
  state: MockState;
} {
  const state: MockState = {
    karma_split_log: [],
    rpcCalls: [],
    rpcResponse: { data: [{ log_id: uuid('log'), pool_tx_ids: ['tx1', 'tx2', 'tx3', 'tx4'], already_processed: false }], error: null },
    ...init,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainFrom = (table: 'karma_split_log'): any => {
    let insertRows: unknown = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = {
      insert(rows: unknown) {
        insertRows = rows;
        const list = Array.isArray(rows) ? rows : [rows];
        const inserted: Array<Record<string, unknown> & { id: string }> = [];
        for (const r of list) {
          const rec: Record<string, unknown> & { id: string } = {
            ...(r as Record<string, unknown>),
            id: uuid(table),
          };
          state[table].push(rec);
          inserted.push(rec);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p: any = Promise.resolve({ data: inserted, error: null });
        p.select = () => ({
          maybeSingle: () => Promise.resolve({ data: inserted[0], error: null }),
        });
        return p;
      },
      then(resolve: (v: unknown) => unknown) {
        if (insertRows !== null) {
          return resolve({ data: state[table], error: null });
        }
        return resolve({ data: null, error: null });
      },
    };
    return obj;
  };

  const client = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from(name: string): any { return chainFrom(name as 'karma_split_log'); },
    rpc(name: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ name, args });
      return Promise.resolve(state.rpcResponse);
    },
  } as unknown as SupabaseClient;

  return { client, state };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeInvoice(over: Partial<{
  id: string | null;
  customer: string | null;
  amount_paid: number | null;
  subMetadata: Record<string, string> | null;
}> = {}): Stripe.Invoice {
  const hasId = Object.prototype.hasOwnProperty.call(over, 'id');
  const hasAmount = Object.prototype.hasOwnProperty.call(over, 'amount_paid');
  const hasSubMeta = Object.prototype.hasOwnProperty.call(over, 'subMetadata');

  const base: Record<string, unknown> = {
    id: hasId ? over.id : `in_${Math.random().toString(36).slice(2, 10)}`,
    customer: over.customer === undefined ? 'cus_test' : over.customer,
    amount_paid: hasAmount ? over.amount_paid : 999, // 9,99 € default
    subscription_details: hasSubMeta
      ? (over.subMetadata === null ? { metadata: null } : { metadata: over.subMetadata! })
      : { metadata: { user_id: 'user-abc' } },
  };
  return base as unknown as Stripe.Invoice;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('dispatchKarmaSplit — skips sans appel RPC', () => {
  test('skip no_invoice_id si invoice.id=null', async () => {
    const { client, state } = makeMock();
    const inv = makeInvoice({ id: null });
    const res = await dispatchKarmaSplit(inv, client);
    expect(res.ok).toBe(true);
    expect(res.status).toBe('skipped');
    expect(res.skipReason).toBe('no_invoice_id');
    expect(state.rpcCalls).toHaveLength(0);
    expect(state.karma_split_log).toHaveLength(0);
  });

  test('skip no_invoice_id si invoice.id=""', async () => {
    const { client, state } = makeMock();
    // Cast contourne le type strict — cas réel : Stripe peut envoyer un
    // invoice sans id sur certains events rares (ex: preview).
    const inv = makeInvoice({ id: null });
    const res = await dispatchKarmaSplit(inv, client);
    expect(res.skipReason).toBe('no_invoice_id');
    expect(state.rpcCalls).toHaveLength(0);
  });

  test('skip zero_amount si amount_paid=0 (écrit quand même un log audit)', async () => {
    const { client, state } = makeMock();
    const inv = makeInvoice({ id: 'in_zero_123', amount_paid: 0 });
    const res = await dispatchKarmaSplit(inv, client);
    expect(res.ok).toBe(true);
    expect(res.status).toBe('skipped');
    expect(res.skipReason).toBe('zero_amount');
    expect(state.rpcCalls).toHaveLength(0);
    expect(state.karma_split_log).toHaveLength(1);
    expect(state.karma_split_log[0].status).toBe('skipped');
    expect(state.karma_split_log[0].skip_reason).toBe('zero_amount');
    expect(state.karma_split_log[0].amount_eur_gross).toBe(0);
  });

  test('skip zero_amount si amount_paid=undefined', async () => {
    const { client, state } = makeMock();
    const inv = makeInvoice({ id: 'in_noamount', amount_paid: null });
    const res = await dispatchKarmaSplit(inv, client);
    expect(res.status).toBe('skipped');
    expect(res.skipReason).toBe('zero_amount');
    expect(state.rpcCalls).toHaveLength(0);
  });
});

test.describe('dispatchKarmaSplit — nominal (RPC appelée)', () => {
  test('abo 9,99 € → status=ok, breakdown correct, RPC args corrects', async () => {
    const logId = 'log-9c99';
    const { client, state } = makeMock({
      rpcResponse: {
        data: [{ log_id: logId, pool_tx_ids: ['tx-r', 'tx-a', 'tx-as', 'tx-s'], already_processed: false }],
        error: null,
      },
    });
    const inv = makeInvoice({ id: 'in_999', amount_paid: 999 });
    const res = await dispatchKarmaSplit(inv, client);
    expect(res.ok).toBe(true);
    expect(res.status).toBe('ok');
    expect(res.logId).toBe(logId);
    expect(res.poolTxIds).toEqual(['tx-r', 'tx-a', 'tx-as', 'tx-s']);
    expect(res.breakdown).toEqual({
      reward_eur: 5.00,
      adya_eur: 1.00,
      asso_eur: 1.00,
      sasu_eur: 2.99,
      total_eur: 9.99,
    });

    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0].name).toBe('karma_split_apply');
    expect(state.rpcCalls[0].args).toEqual({
      p_stripe_invoice_id: 'in_999',
      p_stripe_customer_id: 'cus_test',
      p_user_id: 'user-abc',
      p_amount_eur_gross: 9.99,
      p_split_reward_eur: 5.00,
      p_split_adya_eur: 1.00,
      p_split_asso_eur: 1.00,
      p_split_sasu_eur: 2.99,
    });
    // Pas de log table-direct : tout passe par la RPC en cas nominal
    expect(state.karma_split_log).toHaveLength(0);
  });

  test('abo 39 € → split 19,50 / 3,90 / 3,90 / 11,70', async () => {
    const { client, state } = makeMock();
    const inv = makeInvoice({ id: 'in_3900', amount_paid: 3900 });
    const res = await dispatchKarmaSplit(inv, client);
    expect(res.ok).toBe(true);
    expect(res.status).toBe('ok');
    expect(res.breakdown?.reward_eur).toBe(19.50);
    expect(res.breakdown?.adya_eur).toBe(3.90);
    expect(res.breakdown?.asso_eur).toBe(3.90);
    expect(res.breakdown?.sasu_eur).toBe(11.70);

    expect(state.rpcCalls[0].args.p_split_reward_eur).toBe(19.50);
    expect(state.rpcCalls[0].args.p_split_sasu_eur).toBe(11.70);
  });

  test('user_id null si aucune metadata présente', async () => {
    const { client, state } = makeMock();
    const inv = makeInvoice({ id: 'in_nometa', subMetadata: null });
    await dispatchKarmaSplit(inv, client);
    expect(state.rpcCalls[0].args.p_user_id).toBeNull();
  });
});

test.describe('dispatchKarmaSplit — idempotence', () => {
  test('RPC retourne already_processed=true → status=skipped', async () => {
    const logId = 'log-existing';
    const { client, state } = makeMock({
      rpcResponse: {
        data: [{ log_id: logId, pool_tx_ids: [], already_processed: true }],
        error: null,
      },
    });
    const inv = makeInvoice({ id: 'in_duplicate' });
    const res = await dispatchKarmaSplit(inv, client);
    expect(res.ok).toBe(true);
    expect(res.status).toBe('skipped');
    expect(res.skipReason).toBe('already_processed');
    expect(res.logId).toBe(logId);
    // Breakdown calculé même en skip (informatif pour le caller)
    expect(res.breakdown?.total_eur).toBe(9.99);
    // La RPC a bien été appelée (c'est elle qui détecte l'idempotence)
    expect(state.rpcCalls).toHaveLength(1);
  });
});

test.describe('dispatchKarmaSplit — erreurs', () => {
  test('RPC renvoie error → status=failed + log failed écrit', async () => {
    const { client, state } = makeMock({
      rpcResponse: {
        data: undefined,
        error: { message: 'pool not found' },
      },
    });
    const inv = makeInvoice({ id: 'in_fail' });
    const res = await dispatchKarmaSplit(inv, client);
    expect(res.ok).toBe(false);
    expect(res.status).toBe('failed');
    expect(res.error).toBe('pool not found');
    expect(res.breakdown?.total_eur).toBe(9.99);

    // Log failed row écrit (avec stripe_invoice_id préfixé pour éviter UNIQUE)
    expect(state.karma_split_log).toHaveLength(1);
    expect(state.karma_split_log[0].status).toBe('failed');
    expect(state.karma_split_log[0].error).toBe('pool not found');
    expect(String(state.karma_split_log[0].stripe_invoice_id)).toMatch(/^failed_in_fail_/);
  });
});

test.describe('dispatchKarmaSplit — extractUserId fallbacks', () => {
  test('prend user_id depuis subscription_details.metadata en priorité', async () => {
    const { client, state } = makeMock();
    const inv = makeInvoice({ id: 'in_fallback_1', subMetadata: { user_id: 'user-from-details' } });
    await dispatchKarmaSplit(inv, client);
    expect(state.rpcCalls[0].args.p_user_id).toBe('user-from-details');
  });
});
