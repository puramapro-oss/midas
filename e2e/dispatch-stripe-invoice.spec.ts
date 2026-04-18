// =============================================================================
// MIDAS — dispatchCommissionsFromStripeInvoice unit tests
// Mock Supabase en mémoire (zéro dépendance DB réelle). Couvre les 7 cas edge.
// =============================================================================

import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { dispatchCommissionsFromStripeInvoice } from '../src/lib/commission-engine';

// ---------------------------------------------------------------------------
// In-memory Supabase mock — supporte uniquement les ops utilisées par
// dispatchCommissionsFromStripeInvoice + dispatchCommissions.
// ---------------------------------------------------------------------------

interface MockState {
  commission_dispatch_log: Array<Record<string, unknown>>;
  partner_referrals: Array<{
    id: string;
    partner_id: string;
    referred_user_id: string;
    first_payment_at: string | null;
    status: string;
    created_at: string;
    total_commission_earned?: number;
  }>;
  partners: Array<{
    id: string;
    partnership_version: 'v2' | 'v3';
    level2_partner_id: string | null;
    level3_partner_id: string | null;
    status: string;
  }>;
  partner_commissions: Array<Record<string, unknown> & { id: string }>;
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
}

function uuid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeMock(initial: Partial<MockState> = {}): {
  client: SupabaseClient;
  state: MockState;
} {
  const state: MockState = {
    commission_dispatch_log: [],
    partner_referrals: [],
    partners: [],
    partner_commissions: [],
    rpcCalls: [],
    ...initial,
  };

  const getTable = (name: keyof MockState): Array<Record<string, unknown>> => {
    const t = state[name];
    if (!Array.isArray(t)) throw new Error(`unknown table ${String(name)}`);
    return t as Array<Record<string, unknown>>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainFrom = (table: keyof MockState): any => {
    type Filter = { col: string; op: 'eq' | 'neq' | 'lte' | 'gte' | 'in'; val: unknown };
    const filters: Filter[] = [];
    let orderBy: { col: string; ascending: boolean } | null = null;
    let limit: number | null = null;
    let selectCols: string | null = null;
    let isUpdate: Record<string, unknown> | null = null;
    let isInsert: unknown = null;
    let returnInsertedSelect = false;

    const applyFilters = (): Array<Record<string, unknown>> => {
      let rows = [...getTable(table)];
      for (const f of filters) {
        rows = rows.filter((r) => {
          const v = r[f.col];
          switch (f.op) {
            case 'eq': return v === f.val;
            case 'neq': return v !== f.val;
            case 'lte': return (v as number) <= (f.val as number);
            case 'gte': return (v as number) >= (f.val as number);
            case 'in': return Array.isArray(f.val) && (f.val as unknown[]).includes(v);
          }
        });
      }
      if (orderBy) {
        const { col, ascending } = orderBy;
        rows = rows.sort((a, b) => {
          const av = a[col] as string | number;
          const bv = b[col] as string | number;
          if (av === bv) return 0;
          return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
        });
      }
      if (limit != null) rows = rows.slice(0, limit);
      return rows;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = {
      select(cols?: string) {
        selectCols = cols ?? '*';
        if (isInsert != null) returnInsertedSelect = true;
        return obj;
      },
      eq(col: string, val: unknown) { filters.push({ col, op: 'eq', val }); return obj; },
      neq(col: string, val: unknown) { filters.push({ col, op: 'neq', val }); return obj; },
      lte(col: string, val: unknown) { filters.push({ col, op: 'lte', val }); return obj; },
      gte(col: string, val: unknown) { filters.push({ col, op: 'gte', val }); return obj; },
      in(col: string, val: unknown[]) { filters.push({ col, op: 'in', val }); return obj; },
      order(col: string, opts?: { ascending?: boolean }) {
        orderBy = { col, ascending: opts?.ascending ?? true };
        return obj;
      },
      limit(n: number) { limit = n; return obj; },
      single() {
        const rows = applyFilters();
        if (rows.length === 0) return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        return Promise.resolve({ data: rows[0], error: null });
      },
      maybeSingle() {
        const rows = applyFilters();
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      update(patch: Record<string, unknown>) {
        isUpdate = patch;
        return obj;
      },
      insert(rows: unknown) {
        isInsert = rows;
        const list = Array.isArray(rows) ? rows : [rows];
        const t = getTable(table);
        const inserted: Array<Record<string, unknown> & { id: string }> = [];
        for (const r of list) {
          const rec = { ...(r as Record<string, unknown>) };
          if (!('id' in rec)) rec.id = uuid(table);
          t.push(rec);
          inserted.push(rec as Record<string, unknown> & { id: string });
        }
        // Permet le chaînage .select('id')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p: any = Promise.resolve({ data: inserted, error: null });
        p.select = (cols?: string) => {
          selectCols = cols ?? '*';
          returnInsertedSelect = true;
          return Promise.resolve({ data: inserted, error: null });
        };
        return p;
      },
      then(resolve: (v: { data: unknown; error: null | { message: string } }) => unknown) {
        if (isUpdate) {
          const rows = applyFilters();
          const t = getTable(table);
          for (const r of rows) {
            const idx = t.indexOf(r);
            if (idx >= 0) t[idx] = { ...r, ...isUpdate };
          }
          return resolve({ data: rows, error: null });
        }
        if (returnInsertedSelect && isInsert != null) {
          // déjà résolu via chainage plus haut
          return resolve({ data: [], error: null });
        }
        if (selectCols !== null) {
          const rows = applyFilters();
          return resolve({ data: rows, error: null });
        }
        return resolve({ data: null, error: null });
      },
    };
    return obj;
  };

  const client = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from(name: string): any { return chainFrom(name as keyof MockState); },
    rpc(name: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ name, args });
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as SupabaseClient;

  return { client, state };
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeInvoice(over: Partial<{
  id: string;
  customer: string | null;
  amount_paid: number;
  subMetadata: Record<string, string> | null;
}> = {}): Stripe.Invoice {
  // Attention : `over.subMetadata ?? DEFAULT` confondrait `null` explicite et
  // absent. On utilise un test de présence de clé explicite.
  const hasSubMeta = Object.prototype.hasOwnProperty.call(over, 'subMetadata');
  const subscriptionDetails =
    hasSubMeta && over.subMetadata === null
      ? { metadata: null }
      : { metadata: hasSubMeta ? over.subMetadata! : { user_id: 'user-1' } };

  const base = {
    id: over.id ?? `in_${Math.random().toString(36).slice(2, 10)}`,
    customer: over.customer ?? 'cus_test',
    amount_paid: over.amount_paid ?? 3900, // 39€ default
    subscription_details: subscriptionDetails,
  };
  return base as unknown as Stripe.Invoice;
}

function makePartner(id: string, version: 'v2' | 'v3', l2: string | null = null, l3: string | null = null, status = 'active') {
  return { id, partnership_version: version, level2_partner_id: l2, level3_partner_id: l3, status };
}

function makeReferral(userId: string, partnerId: string, firstPaymentAt: string | null = null) {
  return {
    id: uuid('ref'),
    partner_id: partnerId,
    referred_user_id: userId,
    first_payment_at: firstPaymentAt,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('dispatchCommissionsFromStripeInvoice — edge cases', () => {
  test('skip si invoice sans user_id metadata', async () => {
    const { client, state } = makeMock();
    const inv = makeInvoice({ subMetadata: null });
    const res = await dispatchCommissionsFromStripeInvoice(inv, client);
    expect(res.ok).toBe(true);
    if (res.ok && res.status === 'skipped') {
      expect(res.reason).toBe('no_user_id');
    }
    expect(state.commission_dispatch_log).toHaveLength(1);
    expect(state.commission_dispatch_log[0].skip_reason).toBe('no_user_id');
    expect(state.partner_commissions).toHaveLength(0);
  });

  test('skip si amount_paid = 0 (trial / crédit)', async () => {
    const { client, state } = makeMock();
    const inv = makeInvoice({ amount_paid: 0 });
    const res = await dispatchCommissionsFromStripeInvoice(inv, client);
    expect(res.ok && res.status === 'skipped' && res.reason === 'zero_amount').toBe(true);
    expect(state.commission_dispatch_log[0].skip_reason).toBe('zero_amount');
    expect(state.partner_commissions).toHaveLength(0);
  });

  test('skip si user sans partner_referral', async () => {
    const { client, state } = makeMock({
      partner_referrals: [],
    });
    const inv = makeInvoice({ subMetadata: { user_id: 'orphan-user' } });
    const res = await dispatchCommissionsFromStripeInvoice(inv, client);
    expect(res.ok && res.status === 'skipped' && res.reason === 'no_partner_referral').toBe(true);
    expect(state.commission_dispatch_log).toHaveLength(1);
  });

  test('idempotence : second appel même invoice_id → already_processed', async () => {
    const partnerId = 'partner-v3-1';
    const userId = 'user-idem';
    const invId = 'in_idempotent';

    const { client, state } = makeMock({
      partners: [makePartner(partnerId, 'v3')],
      partner_referrals: [makeReferral(userId, partnerId)],
    });

    const inv1 = makeInvoice({ id: invId, amount_paid: 3900, subMetadata: { user_id: userId } });
    const res1 = await dispatchCommissionsFromStripeInvoice(inv1, client);
    expect(res1.ok && res1.status === 'ok').toBe(true);

    const countBefore = state.partner_commissions.length;
    const inv2 = makeInvoice({ id: invId, amount_paid: 3900, subMetadata: { user_id: userId } });
    const res2 = await dispatchCommissionsFromStripeInvoice(inv2, client);
    expect(res2.ok && res2.status === 'skipped' && res2.reason === 'already_processed').toBe(true);
    expect(state.partner_commissions.length).toBe(countBefore); // pas de nouvelle commission
  });

  test('first payment V3 L1 seul → 50%', async () => {
    const partnerId = 'partner-v3-solo';
    const userId = 'user-first';
    const { client, state } = makeMock({
      partners: [makePartner(partnerId, 'v3')],
      partner_referrals: [makeReferral(userId, partnerId, null)],
    });

    const inv = makeInvoice({ amount_paid: 3900, subMetadata: { user_id: userId } });
    const res = await dispatchCommissionsFromStripeInvoice(inv, client);
    expect(res.ok && res.status === 'ok').toBe(true);
    if (res.ok && res.status === 'ok') {
      expect(res.amountEur).toBe(39);
    }

    expect(state.partner_commissions).toHaveLength(1);
    expect(state.partner_commissions[0].amount).toBe(19.5);
    expect(state.partner_commissions[0].type).toBe('first_month');

    // Referral is_first_payment → passé à active + first_payment_at maj
    const refRow = state.partner_referrals[0];
    expect(refRow.status).toBe('active');
    expect(refRow.first_payment_at).not.toBeNull();

    // Log ok
    expect(state.commission_dispatch_log).toHaveLength(1);
    expect(state.commission_dispatch_log[0].status).toBe('ok');
    expect(state.commission_dispatch_log[0].is_first_payment).toBe(true);
  });

  test('recurring payment V3 chaîne L1+L2+L3 → 50% + 15% + 7%', async () => {
    const l1 = 'partner-l1';
    const l2 = 'partner-l2';
    const l3 = 'partner-l3';
    const userId = 'user-chain';
    const alreadyPaidAt = '2026-01-01T00:00:00Z';

    const { client, state } = makeMock({
      partners: [
        makePartner(l1, 'v3', l2),
        makePartner(l2, 'v3', l3),
        makePartner(l3, 'v3'),
      ],
      partner_referrals: [makeReferral(userId, l1, alreadyPaidAt)],
    });

    const inv = makeInvoice({ amount_paid: 10000, subMetadata: { user_id: userId } }); // 100€
    const res = await dispatchCommissionsFromStripeInvoice(inv, client);
    expect(res.ok && res.status === 'ok').toBe(true);

    const byPartner = new Map(state.partner_commissions.map((c) => [c.partner_id, c.amount]));
    expect(byPartner.get(l1)).toBe(50);
    expect(byPartner.get(l2)).toBe(15);
    expect(byPartner.get(l3)).toBe(7);

    // referral NON modifié (déjà active, first_payment_at existant)
    expect(state.partner_referrals[0].first_payment_at).toBe(alreadyPaidAt);
    // Log is_first_payment=false
    expect(state.commission_dispatch_log[0].is_first_payment).toBe(false);
  });

  test('partner inactif → skipped:partner_inactive (pas failed)', async () => {
    const pid = 'partner-suspended';
    const userId = 'user-sus';
    const { client, state } = makeMock({
      partners: [makePartner(pid, 'v3', null, null, 'suspended')],
      partner_referrals: [makeReferral(userId, pid)],
    });
    const inv = makeInvoice({ subMetadata: { user_id: userId } });
    const res = await dispatchCommissionsFromStripeInvoice(inv, client);
    expect(res.ok && res.status === 'skipped' && res.reason === 'partner_inactive').toBe(true);
    expect(state.commission_dispatch_log[0].skip_reason).toBe('partner_inactive');
    expect(state.partner_commissions).toHaveLength(0);
  });
});
