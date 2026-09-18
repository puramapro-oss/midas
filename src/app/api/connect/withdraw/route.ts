// =============================================================================
// MIDAS — POST /api/connect/withdraw (V4.1 Axe 3)
//
// Retire le solde wallet vers le compte Stripe Connect de l'user authentifié.
// Seuil min 20€ (brief STRIPE_CONNECT_KARMA_V4.md §Grille frais).
//
// Flux :
//   1. Auth + profil (email + wallet_balance)
//   2. Vérif ligne connect_accounts (payouts_enabled=true)
//   3. Zod validation body : {amount_eur?: number} (défaut = balance complet)
//   4. Check amount >= 20 ET amount <= wallet_balance
//   5. RPC debit_wallet_for_withdrawal (atomique, SELECT FOR UPDATE + check)
//   6. stripe.transfers.create(destination=stripe_account_id)
//   7. Si Stripe throw → reversal RPC credit_wallet_on_withdrawal_failure
//      + log row status=failed
//   8. Si OK → INSERT connect_withdrawals status=pending + transfer_id
//
// Codes réponse : 200 OK | 400 validation/insufficient | 401 auth | 403 payouts
// disabled | 500 Stripe/DB error.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceSupabase, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getConnectAccountRow } from '@/lib/stripe/connect';
import { getStripe } from '@/lib/stripe/helpers';
import {
  computeMidasTrustTier,
  detectCollusionClusters,
} from '@/lib/antifraud-helpers';

// ---------------------------------------------------------------------------
// Helpers auth / clients
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Validation body
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  amount_eur: z
    .number()
    .positive('Le montant doit être positif')
    .max(100_000, 'Montant maximum par retrait : 100 000€')
    .optional(),
  idempotencyKey: z.string().uuid().optional(),
});

// Seuil min — brief V4.1 §Grille frais user (20€ = 2,30€ Stripe fee)
const MIN_WITHDRAWAL_EUR = 20;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 2. Parse body (optionnel — si vide = retrait de tout le solde)
    let parsedBody: z.infer<typeof bodySchema> = {};
    try {
      const raw = await req.text();
      if (raw.trim().length > 0) {
        const json: unknown = JSON.parse(raw);
        parsedBody = bodySchema.parse(json);
      }
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Données invalides', details: e.issues },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
    }

    const service = getServiceSupabase();

    // 3. Wallet balance via RPC get_wallet_balance (midas.profiles n'est pas
    //    exposé sur PostgREST, on passe par RPC SECURITY DEFINER search_path
    //    pinned sur midas).
    const { data: balanceData, error: balanceErr } = await service.rpc(
      'get_wallet_balance',
      { p_user_id: user.id },
    );

    if (balanceErr) {
      return NextResponse.json(
        { error: `Lecture du solde impossible : ${balanceErr.message}` },
        { status: 500 },
      );
    }

    const walletBalance = Number(balanceData ?? 0);

    // 4. Détermine le montant final
    const requestedAmount = parsedBody.amount_eur ?? walletBalance;
    const amountEur = Math.round(requestedAmount * 100) / 100; // round 2 dec

    if (amountEur < MIN_WITHDRAWAL_EUR) {
      return NextResponse.json(
        {
          error: `Montant minimum ${MIN_WITHDRAWAL_EUR}€ pour un retrait.`,
          code: 'below_minimum',
          min_eur: MIN_WITHDRAWAL_EUR,
          current_balance_eur: walletBalance,
        },
        { status: 400 },
      );
    }

    if (amountEur > walletBalance) {
      return NextResponse.json(
        {
          error: 'Solde insuffisant',
          code: 'insufficient_balance',
          requested_eur: amountEur,
          current_balance_eur: walletBalance,
        },
        { status: 400 },
      );
    }

    // 5. Vérif compte Connect prêt (payouts_enabled=true)
    const connectAccount = await getConnectAccountRow(service, user.id);
    if (!connectAccount) {
      return NextResponse.json(
        {
          error: 'Compte Stripe Connect non créé. Commence par /compte/connect.',
          code: 'no_connect_account',
        },
        { status: 403 },
      );
    }

    if (!connectAccount.payouts_enabled) {
      return NextResponse.json(
        {
          error:
            'Ton compte n\'est pas encore prêt pour les retraits. Termine la vérification sur /compte/connect.',
          code: 'payouts_disabled',
          stripe_account_id: connectAccount.stripe_account_id,
        },
        { status: 403 },
      );
    }

    // 5b. Anti-fraude : palier de confiance + plafond retrait (@purama/antifraud layer 2)
    const { data: profile } = await service
      .from('profiles')
      .select('phone_verified_at')
      .eq('id', user.id)
      .maybeSingle();

    // Détection collusion (cluster risque élevé → gel préventif)
    const collusionClusters = await detectCollusionClusters(service, [user.id]);
    const hasActiveCollusionFlag = collusionClusters.some((c) => c.shouldFreeze);

    const trustTier = await computeMidasTrustTier({
      kycVerifiedAt: connectAccount.kyc_verified_at,
      phoneVerifiedAt: profile?.phone_verified_at ?? null,
      hasActiveCollusionFlag,
    });

    // Plafond retrait/jour serveur-side (jamais uniquement UI)
    const capEuros = trustTier.withdrawalCapEuros ?? 999999; // null = illimité (palier 3)
    if (amountEur > capEuros) {
      return NextResponse.json(
        {
          error: `Retrait refusé : ton palier actuel (${trustTier.label}) autorise max ${capEuros}€/retrait. ${trustTier.nextTierRequirements.join(', ')}.`,
          code: 'withdrawal_cap_exceeded',
          tier: trustTier.tier,
          cap_eur: capEuros,
          requested_eur: amountEur,
        },
        { status: 403 },
      );
    }

    // Porte liveness au 1er retrait (layer 4) : checkFirstWithdrawalGate exige un
    // faceEmbedding réel qu'aucun provider (Onfido/Veriff) ne fournit encore côté midas.
    // Proxy honnête en attendant : KYC Stripe Connect (kyc_verified_at) fait office de
    // contrôle d'identité au 1er retrait.
    const { data: withdrawalHistory } = await service
      .from('connect_withdrawals')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle();

    const isFirstWithdrawal = !withdrawalHistory;
    if (isFirstWithdrawal && !connectAccount.kyc_verified_at) {
      // Premier retrait sans KYC = refus (proxy liveness tant que provider pas intégré)
      return NextResponse.json(
        {
          error:
            'Premier retrait bloqué : termine la vérification d\'identité Stripe Connect (KYC) avant ton premier retrait.',
          code: 'first_withdrawal_kyc_required',
        },
        { status: 403 },
      );
    }

    // 6. Débit wallet atomique (SELECT FOR UPDATE + CHECK balance)
    //    Si insuffisant → RAISE 'insufficient_balance' → erreur Supabase.
    const { data: debitData, error: debitErr } = await service.rpc(
      'debit_wallet_for_withdrawal',
      {
        p_user_id: user.id,
        p_amount: amountEur,
      },
    );

    if (debitErr) {
      const msg = debitErr.message || 'Erreur débit';
      if (msg.includes('insufficient_balance')) {
        return NextResponse.json(
          {
            error: 'Solde insuffisant (concurrence détectée)',
            code: 'insufficient_balance',
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: msg, code: 'debit_failed' }, { status: 500 });
    }

    const newBalance = typeof debitData === 'number' ? debitData : walletBalance - amountEur;

    // 7. Stripe Transfer
    //    Si échec → reverser immédiatement + log row failed pour audit.
    const stripe = getStripe();
    let transferId: string | null = null;
    let stripeError: string | null = null;

    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(amountEur * 100),
        currency: 'eur',
        destination: connectAccount.stripe_account_id,
        description: `Retrait wallet MIDAS user ${user.id}`,
        metadata: {
          user_id: user.id,
          app: 'midas',
          source: 'connect_withdraw',
        },
      }, { idempotencyKey: parsedBody.idempotencyKey ?? crypto.randomUUID() });
      transferId = transfer.id;
    } catch (e) {
      stripeError = e instanceof Error ? e.message : 'Stripe transfer failed';
    }

    // 8. Insert row connect_withdrawals (toujours, pending ou failed)
    const status = stripeError ? 'failed' : 'pending';
    const { error: insertErr } = await service
      .from('connect_withdrawals')
      .insert({
        user_id: user.id,
        stripe_account_id: connectAccount.stripe_account_id,
        stripe_transfer_id: transferId,
        amount_eur: amountEur,
        status,
        error: stripeError,
      });

    if (insertErr) {
      // Log best-effort : même si on ne peut pas logger la ligne, on a déjà
      // débité (si status=pending) ou on va reverser (si status=failed).
      // On n'échoue pas la réponse pour ne pas induire un double-débit au retry.
    }

    if (stripeError) {
      // Reverser le débit wallet pour ne pas léser l'user
      await service.rpc('credit_wallet_on_withdrawal_failure', {
        p_user_id: user.id,
        p_amount: amountEur,
      });
      return NextResponse.json(
        {
          error: `Transfert Stripe échoué : ${stripeError}. Ton solde a été restauré.`,
          code: 'stripe_transfer_failed',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      transfer_id: transferId,
      amount_eur: amountEur,
      new_balance_eur: newBalance,
      status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne lors du retrait';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET intentionnellement non défini → Next.js renvoie 405 Method Not Allowed.
