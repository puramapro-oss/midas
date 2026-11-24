import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceSupabase, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getConnectAccountRow } from '@/lib/stripe/connect';
import { getStripe } from '@/lib/stripe/helpers';
import { computeMidasTrustTier, detectCollusionClusters } from '@/lib/antifraud-helpers';
import { isWithdrawalAvailable } from '@/lib/phase';
import { readWithdrawalReceipt, readWithdrawalRejection, readWithdrawalTransfer, type WithdrawalReceipt } from '@/lib/stripe/withdrawal-receipt';

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* noop */
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
}

function getServiceSupabase(): SupabaseClient {
  return createServiceSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const bodySchema = z.object({
  amount_eur: z.number().finite().min(20).max(100_000)
    .refine((amount) => Math.round(amount * 100) / 100 === amount, 'Deux décimales maximum').optional(),
  idempotencyKey: z.string().uuid().transform(value => value.toLowerCase()),
  expectedUserId: z.string().uuid().transform(value => value.toLowerCase()),
  expectedAccountId: z.string().regex(/^acct_[A-Za-z0-9]+$/),
});

function uncertain(withdrawalId?: string) {
  return NextResponse.json({
    error: 'Le résultat de cette demande reste à confirmer. Conserve cette demande ; aucun nouveau transfert ne sera envoyé lors de sa vérification.',
    code: 'withdrawal_reconciliation_required',
    withdrawal_id: withdrawalId,
  }, { status: 409 });
}

function confirmed(receipt: WithdrawalReceipt, replayed: boolean) {
  return NextResponse.json({
    ok: true, withdrawal_id: receipt.id, user_id: receipt.user_id,
    idempotency_key: receipt.request_key, stripe_account_id: receipt.stripe_account_id,
    transfer_id: receipt.stripe_transfer_id, amount_eur: receipt.amount_eur,
    new_balance_eur: receipt.wallet_balance, status: receipt.status,
    reversed_amount_eur: receipt.credited_reversal_eur, replayed,
  });
}

export async function POST(req: NextRequest) {
  // Keep the existing phase decision in the handler, including direct invocation.
  if (!isWithdrawalAvailable()) {
    return NextResponse.json({ error: 'Les retraits monétaires ne sont pas activés.', code: 'PHASE_1_LOCKED' }, { status: 403 });
  }
  try {
    const { user } = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return NextResponse.json({ error: 'Montant, compte ou identifiant de demande invalide.', code: 'withdrawal_invalid_request' }, { status: 400 });
    }
    if (body.expectedUserId !== user.id) {
      return NextResponse.json({ error: 'Le compte connecté a changé. Recharge ton compte avant de continuer.', code: 'withdrawal_account_changed' }, { status: 409 });
    }

    const service = getServiceSupabase();
    const connectAccount = await getConnectAccountRow(service, user.id);
    if (!connectAccount || connectAccount.stripe_account_id !== body.expectedAccountId) {
      return NextResponse.json({ error: 'Le compte de retrait a changé. Recharge ton compte avant de continuer.', code: 'withdrawal_account_changed' }, { status: 409 });
    }
    if (!connectAccount.payouts_enabled || !connectAccount.kyc_verified_at) {
      return NextResponse.json({ error: 'Termine la vérification du compte de retrait.', code: 'payouts_disabled' }, { status: 403 });
    }
    const { data: profile, error: profileError } = await service.from('profiles')
      .select('phone_verified_at').eq('id', user.id).maybeSingle();
    if (profileError || !profile) return NextResponse.json({ error: 'Vérification du profil indisponible.' }, { status: 503 });
    const clusters = await detectCollusionClusters(service, [user.id]);
    const trustTier = await computeMidasTrustTier({
      kycVerifiedAt: connectAccount.kyc_verified_at,
      phoneVerifiedAt: profile.phone_verified_at ?? null,
      hasActiveCollusionFlag: clusters.some((cluster) => cluster.shouldFreeze),
    });
    const cap = trustTier.withdrawalCapEuros ?? 100_000;
    if (!Number.isFinite(cap) || cap < 0) return NextResponse.json({ error: 'Plafond de retrait indisponible.' }, { status: 503 });
    // Validate provider configuration before reserving any funds.
    const stripe = getStripe();
    const { data, error } = await service.rpc('admit_connect_withdrawal', {
      p_user_id: user.id, p_request_key: body.idempotencyKey,
      p_amount: body.amount_eur ?? null, p_destination: connectAccount.stripe_account_id,
      p_cap: Math.min(cap, 100_000),
    });
    if (error) {
      const code = error.message ?? '';
      if (code.includes('withdrawal_idempotency_conflict')) return NextResponse.json({ error: 'Cette demande correspond déjà à un autre montant ou compte.', code: 'withdrawal_idempotency_conflict' }, { status: 409 });
      // An exception rolls the transaction back; it cannot seal a request key.
      return uncertain();
    }
    let admission: WithdrawalReceipt;
    try {
      const rejection = readWithdrawalRejection(data, {
        userId: user.id, requestKey: body.idempotencyKey, destination: connectAccount.stripe_account_id, amount: body.amount_eur,
      });
      if (rejection) return NextResponse.json(rejection, { status: rejection.code === 'withdrawal_cap_exceeded' ? 403 : 400 });
      admission = readWithdrawalReceipt(data, {
        userId: user.id, requestKey: body.idempotencyKey,
        destination: connectAccount.stripe_account_id, amount: body.amount_eur,
      });
    } catch { return uncertain(); }
    if (!admission.applied) {
      return admission.provider_confirmed ? confirmed(admission, true) : uncertain(admission.id);
    }
    if (admission.provider_confirmed) return uncertain(admission.id);

    // Only the transaction's first admission may send. A replay never relies on
    // Stripe retaining its idempotency key indefinitely (keys can expire).
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(admission.amount_eur * 100), currency: 'eur',
        destination: admission.stripe_account_id,
        description: 'Retrait wallet MIDAS',
        metadata: { user_id: user.id, withdrawal_id: admission.id, app: 'midas', source: 'connect_withdraw' },
      }, { idempotencyKey: `midas-withdrawal-${admission.id}` });
      const observation = readWithdrawalTransfer(transfer);
      if (observation.p_user_id !== user.id || observation.p_withdrawal_id !== admission.id ||
          observation.p_destination !== admission.stripe_account_id || observation.p_amount !== admission.amount_eur) return uncertain(admission.id);
      const { data: receiptData, error: receiptError } = await service.rpc('reconcile_connect_withdrawal', observation);
      if (receiptError) return uncertain(admission.id);
      const receipt = readWithdrawalReceipt(receiptData, {
        userId: user.id, requestKey: body.idempotencyKey, withdrawalId: admission.id,
        destination: admission.stripe_account_id, amount: admission.amount_eur, transferId: transfer.id,
      });
      if (!receipt.provider_confirmed) return uncertain(admission.id);
      return confirmed(receipt, false);
    } catch {
      // A timeout can follow a real transfer. Keep its debit and journal for a
      // signed receipt/reconciliation; never invent a refund or send again.
      return uncertain(admission.id);
    }
  } catch {
    return NextResponse.json({ error: 'Le service de retrait est indisponible.' }, { status: 503 });
  }
}
