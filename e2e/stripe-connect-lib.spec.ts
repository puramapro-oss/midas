// =============================================================================
// MIDAS — Unit tests pour src/lib/stripe/connect.ts (V4.1)
// Mock Supabase en mémoire — couvre projection, DB ops, logique de stages.
// Les appels Stripe réels ne sont pas couverts ici (vus en E2E via API routes).
// =============================================================================

import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  deriveOnboardingStage,
  getConnectAccountRow,
  getConnectAccountSummary,
  syncConnectAccount,
} from '../src/lib/stripe/connect';
import type { ConnectAccount } from '../src/types/database';

// ---------------------------------------------------------------------------
// Mock Supabase minimal — supporte .from().select().eq().maybeSingle() et .rpc()
// ---------------------------------------------------------------------------

interface MockState {
  connect_accounts: ConnectAccount[];
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  rpcResponse: unknown;
}

function makeMockSupabase(initial: Partial<MockState> = {}): {
  client: SupabaseClient;
  state: MockState;
} {
  const state: MockState = {
    connect_accounts: [],
    rpcCalls: [],
    rpcResponse: null,
    ...initial,
  };

  const client = {
    from(table: string) {
      if (table !== 'connect_accounts') {
        throw new Error(`unexpected table ${table}`);
      }
      const filters: Array<{ col: string; val: unknown }> = [];
      const chain = {
        select(_cols: string) {
          return chain;
        },
        eq(col: string, val: unknown) {
          filters.push({ col, val });
          return chain;
        },
        async maybeSingle() {
          const row =
            state.connect_accounts.find((r) =>
              filters.every((f) => (r as unknown as Record<string, unknown>)[f.col] === f.val),
            ) ?? null;
          return { data: row, error: null };
        },
      };
      return chain;
    },
    async rpc(name: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ name, args });
      return { data: state.rpcResponse, error: null };
    },
  } as unknown as SupabaseClient;

  return { client, state };
}

function makeAccount(overrides: Partial<ConnectAccount> = {}): ConnectAccount {
  return {
    user_id: 'user-1',
    stripe_account_id: 'acct_test_1',
    country: 'FR',
    default_currency: 'eur',
    onboarding_completed: false,
    details_submitted: false,
    charges_enabled: false,
    payouts_enabled: false,
    kyc_verified_at: null,
    disabled_reason: null,
    capabilities: {},
    requirements: {},
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// deriveOnboardingStage — logique de projection pure
// ---------------------------------------------------------------------------

test.describe('deriveOnboardingStage', () => {
  test('not_started when nothing submitted', () => {
    const stage = deriveOnboardingStage(
      { onboarding_completed: false, payouts_enabled: false, details_submitted: false },
      {},
    );
    expect(stage).toBe('not_started');
  });

  test('in_progress when details submitted but not verified', () => {
    const stage = deriveOnboardingStage(
      { onboarding_completed: false, payouts_enabled: false, details_submitted: true },
      {},
    );
    expect(stage).toBe('in_progress');
  });

  test('requirements_due when currently_due has entries', () => {
    const stage = deriveOnboardingStage(
      { onboarding_completed: false, payouts_enabled: false, details_submitted: true },
      { currently_due: ['business_profile.url'] },
    );
    expect(stage).toBe('requirements_due');
  });

  test('requirements_due when past_due has entries', () => {
    const stage = deriveOnboardingStage(
      { onboarding_completed: true, payouts_enabled: false, details_submitted: true },
      { past_due: ['external_account'] },
    );
    expect(stage).toBe('requirements_due');
  });

  test('verified when onboarding_completed and payouts_enabled', () => {
    const stage = deriveOnboardingStage(
      { onboarding_completed: true, payouts_enabled: true, details_submitted: true },
      {},
    );
    expect(stage).toBe('verified');
  });
});

// ---------------------------------------------------------------------------
// getConnectAccountRow — lecture DB
// ---------------------------------------------------------------------------

test.describe('getConnectAccountRow', () => {
  test('returns null when no row', async () => {
    const { client } = makeMockSupabase();
    const row = await getConnectAccountRow(client, 'user-1');
    expect(row).toBeNull();
  });

  test('returns the row when present', async () => {
    const account = makeAccount({ user_id: 'user-abc', stripe_account_id: 'acct_abc' });
    const { client } = makeMockSupabase({ connect_accounts: [account] });
    const row = await getConnectAccountRow(client, 'user-abc');
    expect(row).not.toBeNull();
    expect(row?.stripe_account_id).toBe('acct_abc');
  });

  test('filters by user_id (never returns another user row)', async () => {
    const other = makeAccount({ user_id: 'user-other', stripe_account_id: 'acct_other' });
    const { client } = makeMockSupabase({ connect_accounts: [other] });
    const row = await getConnectAccountRow(client, 'user-target');
    expect(row).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// syncConnectAccount — projection Stripe.Account → RPC
// ---------------------------------------------------------------------------

test.describe('syncConnectAccount', () => {
  test('calls upsert_connect_account RPC with mapped fields', async () => {
    const updated = makeAccount({
      user_id: 'user-42',
      stripe_account_id: 'acct_42',
      details_submitted: true,
      payouts_enabled: true,
      onboarding_completed: true,
    });
    const { client, state } = makeMockSupabase({ rpcResponse: updated });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripeAccount = {
      id: 'acct_42',
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: true,
      country: 'FR',
      default_currency: 'eur',
      capabilities: { transfers: 'active' },
      requirements: { disabled_reason: null, currently_due: [], past_due: [] },
    } as any;

    const result = await syncConnectAccount(client, 'user-42', stripeAccount);

    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0]?.name).toBe('upsert_connect_account');
    expect(state.rpcCalls[0]?.args.p_user_id).toBe('user-42');
    expect(state.rpcCalls[0]?.args.p_stripe_account_id).toBe('acct_42');
    expect(state.rpcCalls[0]?.args.p_details_submitted).toBe(true);
    expect(state.rpcCalls[0]?.args.p_charges_enabled).toBe(true);
    expect(state.rpcCalls[0]?.args.p_payouts_enabled).toBe(true);
    expect(state.rpcCalls[0]?.args.p_country).toBe('FR');
    expect(result.stripe_account_id).toBe('acct_42');
  });

  test('defaults disabled_reason to null when missing in Stripe response', async () => {
    const updated = makeAccount();
    const { client, state } = makeMockSupabase({ rpcResponse: updated });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripeAccount = {
      id: 'acct_nodis',
      details_submitted: false,
      charges_enabled: false,
      payouts_enabled: false,
      country: 'FR',
      default_currency: 'eur',
    } as any;

    await syncConnectAccount(client, 'user-1', stripeAccount);

    expect(state.rpcCalls[0]?.args.p_disabled_reason).toBeNull();
    expect(state.rpcCalls[0]?.args.p_capabilities).toEqual({});
    expect(state.rpcCalls[0]?.args.p_requirements).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getConnectAccountSummary — projection UI (chemin sans hit Stripe)
// ---------------------------------------------------------------------------

test.describe('getConnectAccountSummary — user sans compte', () => {
  test('returns not_started when no row exists', async () => {
    const { client } = makeMockSupabase();
    const summary = await getConnectAccountSummary(client, 'user-new');
    expect(summary.stripe_account_id).toBeNull();
    expect(summary.stage).toBe('not_started');
    expect(summary.payouts_enabled).toBe(false);
    expect(summary.charges_enabled).toBe(false);
    expect(summary.requirements_summary.currently_due).toEqual([]);
    expect(summary.requirements_summary.past_due).toEqual([]);
  });
});
