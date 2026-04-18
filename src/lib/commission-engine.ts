// =============================================================================
// MIDAS — Commission Engine (Parrainage V4)
// Calcule et crée les commissions à partir d'un paiement (facture Stripe /
// renouvellement / reward admin). Supporte les 2 barèmes en parallèle :
//   - v2 (legacy) : 50% first_month + 10% recurring + 15% L2
//   - v3 (lifetime) : 50% L1 + 15% L2 + 7% L3, à vie
//
// Choix du barème = `partners.partnership_version`. Lorsqu'un parrain est v3,
// toute la chaîne (L1→L2→L3) lit v3. Si un L2 ou L3 est historique v2, c'est
// son propre barème appliqué (protection droits acquis — pas d'effet puisque
// dans v2 il n'y a PAS de L3, donc L3 retombe à 0 : pour éviter ça, on force
// la version du parrain L1 pour TOUTE la chaîne. C'est la règle simple, et
// c'est alignée avec le brief : "tous nouveaux signups = v3 par défaut").
// =============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import type {
  CommissionType,
  PartnershipVersion,
} from '@/types/partnership';
import {
  COMMISSION_RATES_V2,
  COMMISSION_RATES_V3,
} from '@/types/partnership';

export interface PartnerMinimal {
  id: string;
  partnership_version: PartnershipVersion;
  level2_partner_id: string | null;
  level3_partner_id: string | null;
  status: string;
}

export interface CommissionEvent {
  /** Le partner L1 direct de l'utilisateur payeur. */
  partnerId: string;
  /** Référence stripe pour la traçabilité. */
  stripePaymentId?: string | null;
  /** Référence partner_referrals, si disponible. */
  referralId?: string | null;
  /** Montant HT du paiement (en EUR, sans centimes). */
  paidAmountEur: number;
  /** Est-ce le tout premier paiement du filleul ? (utile v2 pour first_month). */
  isFirstPayment: boolean;
  /** Description humaine pour le log. */
  description?: string;
}

export interface CommissionRow {
  partner_id: string;
  referral_id: string | null;
  type: CommissionType;
  amount: number;
  currency: 'EUR';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  stripe_payment_id: string | null;
  description: string;
  level: number;
  partnership_version: PartnershipVersion;
}

// ---------------------------------------------------------------------------
// Résolution de la chaîne de parrains L1/L2/L3
// ---------------------------------------------------------------------------

function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function fetchPartnerMinimal(
  supabase: SupabaseClient,
  partnerId: string,
): Promise<PartnerMinimal | null> {
  const { data } = await supabase
    .from('partners')
    .select('id, partnership_version, level2_partner_id, level3_partner_id, status')
    .eq('id', partnerId)
    .maybeSingle<PartnerMinimal>();
  return data ?? null;
}

interface ResolvedChain {
  l1: PartnerMinimal;
  l2: PartnerMinimal | null;
  l3: PartnerMinimal | null;
}

async function resolveChain(
  supabase: SupabaseClient,
  l1Id: string,
): Promise<ResolvedChain | null> {
  const l1 = await fetchPartnerMinimal(supabase, l1Id);
  if (!l1 || l1.status !== 'active') return null;

  const l2 = l1.level2_partner_id
    ? await fetchPartnerMinimal(supabase, l1.level2_partner_id)
    : null;
  const l3 = l1.level3_partner_id
    ? await fetchPartnerMinimal(supabase, l1.level3_partner_id)
    : l2?.level2_partner_id
      ? await fetchPartnerMinimal(supabase, l2.level2_partner_id)
      : null;

  return { l1, l2, l3 };
}

// ---------------------------------------------------------------------------
// Calcul des commissions (pure, testable)
// ---------------------------------------------------------------------------

export function computeCommissions(args: {
  chain: ResolvedChain;
  paidAmountEur: number;
  isFirstPayment: boolean;
  stripePaymentId?: string | null;
  referralId?: string | null;
  description?: string;
}): CommissionRow[] {
  const { chain, paidAmountEur, isFirstPayment, stripePaymentId, referralId } =
    args;

  const version = chain.l1.partnership_version;
  const rates = version === 'v3' ? COMMISSION_RATES_V3 : COMMISSION_RATES_V2;
  const rows: CommissionRow[] = [];

  if (paidAmountEur <= 0) return rows;

  // -------------------------------------------------------------------------
  // L1 — toujours crédité
  // -------------------------------------------------------------------------
  if (version === 'v2') {
    // V2 : first_month 50% puis recurring 10%
    if (isFirstPayment) {
      rows.push({
        partner_id: chain.l1.id,
        referral_id: referralId ?? null,
        type: 'first_month',
        amount: round2(paidAmountEur * rates.first_month),
        currency: 'EUR',
        status: 'pending',
        stripe_payment_id: stripePaymentId ?? null,
        description: args.description ?? 'first_month commission',
        level: 1,
        partnership_version: 'v2',
      });
    } else {
      rows.push({
        partner_id: chain.l1.id,
        referral_id: referralId ?? null,
        type: 'recurring',
        amount: round2(paidAmountEur * rates.recurring),
        currency: 'EUR',
        status: 'pending',
        stripe_payment_id: stripePaymentId ?? null,
        description: args.description ?? 'recurring commission',
        level: 1,
        partnership_version: 'v2',
      });
    }
  } else {
    // V3 : 50% lifetime sur L1 (même montant à chaque cycle)
    rows.push({
      partner_id: chain.l1.id,
      referral_id: referralId ?? null,
      type: isFirstPayment ? 'first_month' : 'recurring',
      amount: round2(paidAmountEur * rates.recurring),
      currency: 'EUR',
      status: 'pending',
      stripe_payment_id: stripePaymentId ?? null,
      description: args.description ?? 'L1 lifetime 50%',
      level: 1,
      partnership_version: 'v3',
    });
  }

  // -------------------------------------------------------------------------
  // L2 — 15% (v2 et v3). V2 : seulement quand L1 touche (logique héritée).
  // -------------------------------------------------------------------------
  if (chain.l2 && chain.l2.status === 'active') {
    rows.push({
      partner_id: chain.l2.id,
      referral_id: referralId ?? null,
      type: 'level2',
      amount: round2(paidAmountEur * rates.level2),
      currency: 'EUR',
      status: 'pending',
      stripe_payment_id: stripePaymentId ?? null,
      description: args.description ?? 'L2 15%',
      level: 2,
      partnership_version: version,
    });
  }

  // -------------------------------------------------------------------------
  // L3 — 7% UNIQUEMENT en v3
  // -------------------------------------------------------------------------
  if (version === 'v3' && chain.l3 && chain.l3.status === 'active') {
    rows.push({
      partner_id: chain.l3.id,
      referral_id: referralId ?? null,
      type: 'level3',
      amount: round2(paidAmountEur * rates.level3),
      currency: 'EUR',
      status: 'pending',
      stripe_payment_id: stripePaymentId ?? null,
      description: args.description ?? 'L3 7% lifetime',
      level: 3,
      partnership_version: 'v3',
    });
  }

  return rows.filter((r) => r.amount > 0);
}

// ---------------------------------------------------------------------------
// Orchestrateur — utilisé par le webhook Stripe et /api/referral/reward
// ---------------------------------------------------------------------------

export interface DispatchSuccess {
  ok: true;
  rows: CommissionRow[];
  insertedIds: string[];
}
export interface DispatchFailure {
  ok: false;
  error: string;
}

export async function dispatchCommissions(
  event: CommissionEvent,
  supabase?: SupabaseClient,
): Promise<DispatchSuccess | DispatchFailure> {
  const db = supabase ?? getAdminClient();

  try {
    const chain = await resolveChain(db, event.partnerId);
    if (!chain) {
      return { ok: false, error: 'partner_not_found_or_inactive' };
    }

    const rows = computeCommissions({
      chain,
      paidAmountEur: event.paidAmountEur,
      isFirstPayment: event.isFirstPayment,
      stripePaymentId: event.stripePaymentId,
      referralId: event.referralId,
      description: event.description,
    });

    if (rows.length === 0) return { ok: true, rows: [], insertedIds: [] };

    const insertRes = await db
      .from('partner_commissions')
      .insert(rows)
      .select('id');
    if (insertRes.error) return { ok: false, error: insertRes.error.message };

    const insertedIds = (insertRes.data ?? [])
      .map((r) => (r as { id?: string }).id)
      .filter((id): id is string => typeof id === 'string');

    // Mettre à jour les totaux sur partners (fire-and-forget, non bloquant)
    for (const r of rows) {
      try {
        const rpcRes = await db.rpc('increment_partner_balance', {
          p_partner_id: r.partner_id,
          p_amount: r.amount,
        });
        // Si la RPC n'existe pas, on ignore silencieusement — les totaux
        // peuvent être recomputed par un CRON de réconciliation plus tard.
        if (rpcRes.error) {
          // noop
        }
      } catch {
        // noop
      }
    }

    return { ok: true, rows, insertedIds };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

// ---------------------------------------------------------------------------
// Stripe webhook helper — invoice.paid → dispatchCommissionsFromStripeInvoice
// ---------------------------------------------------------------------------

export type StripeDispatchResult =
  | { ok: true; status: 'ok'; dispatchedIds: string[]; amountEur: number }
  | { ok: true; status: 'skipped'; reason: StripeDispatchSkipReason }
  | { ok: false; status: 'failed'; error: string };

export type StripeDispatchSkipReason =
  | 'already_processed'
  | 'zero_amount'
  | 'no_user_id'
  | 'no_partner_referral'
  | 'partner_inactive'
  | 'no_commissions_computed';

interface PartnerReferralRow {
  id: string;
  partner_id: string;
  referred_user_id: string;
  first_payment_at: string | null;
  status: 'pending' | 'active' | 'churned';
}

/**
 * Déclenché par le webhook Stripe `invoice.paid`.
 *
 * Responsabilités :
 *  1. Idempotence stricte via `commission_dispatch_log.stripe_invoice_id` UNIQUE.
 *  2. Résout le partner via `partner_referrals.referred_user_id` (dernier non churned).
 *  3. Convertit `invoice.amount_paid` (cents) en EUR, rejette si 0 (trial / crédit).
 *  4. Détermine `isFirstPayment` via `partner_referrals.first_payment_at IS NULL`.
 *  5. Appelle `dispatchCommissions()`, INSERT log row, UPDATE référence status/date.
 *
 * Ne throw JAMAIS — toute erreur est loggée en base avec `status='failed'` pour
 * garantir que le webhook Stripe retourne toujours 200.
 */
export async function dispatchCommissionsFromStripeInvoice(
  invoice: Stripe.Invoice,
  supabase?: SupabaseClient,
): Promise<StripeDispatchResult> {
  const db = supabase ?? getAdminClient();
  const invoiceId = invoice.id ?? '';

  // Identifiants
  const stripeCustomerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;

  // user_id provient de subscription.metadata (pattern existant MIDAS : le
  // webhook checkout + invoice pose metadata.user_id sur la subscription).
  const subMeta = extractInvoiceMetadata(invoice);
  const userId = subMeta.userId;

  try {
    // 1. Idempotence check
    if (invoiceId) {
      const existing = await db
        .from('commission_dispatch_log')
        .select('id, status')
        .eq('stripe_invoice_id', invoiceId)
        .maybeSingle();

      if (existing.data) {
        return { ok: true, status: 'skipped', reason: 'already_processed' };
      }
    }

    // 2. Skip si metadata manquante
    if (!userId) {
      await writeLog(db, {
        stripe_invoice_id: invoiceId || `noid_${Date.now()}`,
        stripe_customer_id: stripeCustomerId,
        user_id: null,
        partner_id: null,
        amount_eur: 0,
        is_first_payment: false,
        commission_ids: [],
        status: 'skipped',
        skip_reason: 'no_user_id',
        error: null,
      });
      return { ok: true, status: 'skipped', reason: 'no_user_id' };
    }

    // 3. Montant
    const amountEur = (invoice.amount_paid ?? 0) / 100;
    if (amountEur <= 0) {
      await writeLog(db, {
        stripe_invoice_id: invoiceId,
        stripe_customer_id: stripeCustomerId,
        user_id: userId,
        partner_id: null,
        amount_eur: 0,
        is_first_payment: false,
        commission_ids: [],
        status: 'skipped',
        skip_reason: 'zero_amount',
        error: null,
      });
      return { ok: true, status: 'skipped', reason: 'zero_amount' };
    }

    // 4. Resolve partner referral (dernier non churned)
    const referralRes = await db
      .from('partner_referrals')
      .select('id, partner_id, referred_user_id, first_payment_at, status')
      .eq('referred_user_id', userId)
      .neq('status', 'churned')
      .order('created_at', { ascending: false })
      .limit(1);

    const referralRows = (referralRes.data ?? []) as PartnerReferralRow[];
    const referral = referralRows[0] ?? null;

    if (!referral) {
      await writeLog(db, {
        stripe_invoice_id: invoiceId,
        stripe_customer_id: stripeCustomerId,
        user_id: userId,
        partner_id: null,
        amount_eur: amountEur,
        is_first_payment: false,
        commission_ids: [],
        status: 'skipped',
        skip_reason: 'no_partner_referral',
        error: null,
      });
      return { ok: true, status: 'skipped', reason: 'no_partner_referral' };
    }

    const isFirstPayment = referral.first_payment_at === null;

    // 5. Dispatch
    const dispatchRes = await dispatchCommissions(
      {
        partnerId: referral.partner_id,
        stripePaymentId: invoiceId,
        referralId: referral.id,
        paidAmountEur: amountEur,
        isFirstPayment,
        description: isFirstPayment
          ? `Invoice ${invoiceId} — first payment`
          : `Invoice ${invoiceId} — recurring`,
      },
      db,
    );

    if (!dispatchRes.ok) {
      // Partner inactif / autre erreur dispatch
      const isInactive = dispatchRes.error === 'partner_not_found_or_inactive';
      await writeLog(db, {
        stripe_invoice_id: invoiceId,
        stripe_customer_id: stripeCustomerId,
        user_id: userId,
        partner_id: referral.partner_id,
        amount_eur: amountEur,
        is_first_payment: isFirstPayment,
        commission_ids: [],
        status: isInactive ? 'skipped' : 'failed',
        skip_reason: isInactive ? 'partner_inactive' : null,
        error: isInactive ? null : dispatchRes.error,
      });
      if (isInactive) {
        return { ok: true, status: 'skipped', reason: 'partner_inactive' };
      }
      return { ok: false, status: 'failed', error: dispatchRes.error };
    }

    if (dispatchRes.rows.length === 0) {
      await writeLog(db, {
        stripe_invoice_id: invoiceId,
        stripe_customer_id: stripeCustomerId,
        user_id: userId,
        partner_id: referral.partner_id,
        amount_eur: amountEur,
        is_first_payment: isFirstPayment,
        commission_ids: [],
        status: 'skipped',
        skip_reason: 'no_commissions_computed',
        error: null,
      });
      return { ok: true, status: 'skipped', reason: 'no_commissions_computed' };
    }

    // 6. Success — log + update referral status/date
    await writeLog(db, {
      stripe_invoice_id: invoiceId,
      stripe_customer_id: stripeCustomerId,
      user_id: userId,
      partner_id: referral.partner_id,
      amount_eur: amountEur,
      is_first_payment: isFirstPayment,
      commission_ids: dispatchRes.insertedIds,
      status: 'ok',
      skip_reason: null,
      error: null,
    });

    if (isFirstPayment) {
      await db
        .from('partner_referrals')
        .update({
          first_payment_at: new Date().toISOString(),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);
    }

    // Accumulateur total_commission_earned sur partner_referrals (reporting)
    const total = dispatchRes.rows
      .filter((r) => r.partner_id === referral.partner_id)
      .reduce((s, r) => s + r.amount, 0);
    if (total > 0) {
      await db.rpc('increment_referral_commission_total', {
        p_referral_id: referral.id,
        p_amount: total,
      }).then((res) => {
        if (res.error) {
          // noop — RPC facultative, le log suffit pour audit.
        }
      }, () => { /* noop */ });
    }

    return {
      ok: true,
      status: 'ok',
      dispatchedIds: dispatchRes.insertedIds,
      amountEur,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    try {
      await writeLog(db, {
        stripe_invoice_id: invoiceId || `exception_${Date.now()}`,
        stripe_customer_id: stripeCustomerId,
        user_id: userId ?? null,
        partner_id: null,
        amount_eur: (invoice.amount_paid ?? 0) / 100,
        is_first_payment: false,
        commission_ids: [],
        status: 'failed',
        skip_reason: null,
        error: msg,
      });
    } catch { /* noop */ }
    return { ok: false, status: 'failed', error: msg };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface LogInsert {
  stripe_invoice_id: string;
  stripe_customer_id: string | null;
  user_id: string | null;
  partner_id: string | null;
  amount_eur: number;
  is_first_payment: boolean;
  commission_ids: string[];
  status: 'ok' | 'skipped' | 'failed';
  skip_reason: string | null;
  error: string | null;
}

async function writeLog(db: SupabaseClient, row: LogInsert): Promise<void> {
  try {
    await db.from('commission_dispatch_log').insert(row);
  } catch {
    // Le log audit ne doit jamais casser le flow webhook — silent catch.
  }
}

function extractInvoiceMetadata(invoice: Stripe.Invoice): { userId: string | null } {
  // Stripe expose invoice.subscription_details.metadata depuis 2024 + metadata
  // directe sur invoice. Fallback sur invoice.metadata, puis subscription metadata.
  type WithMetadata = { metadata?: Record<string, string> | null };
  type InvoiceWithDetails = Stripe.Invoice & {
    subscription_details?: WithMetadata | null;
    subscription?: string | (Stripe.Subscription & WithMetadata) | null;
  };

  const inv = invoice as InvoiceWithDetails;

  const fromDetails = inv.subscription_details?.metadata?.user_id ?? null;
  const fromInvoice = inv.metadata?.user_id ?? null;
  const fromSub =
    typeof inv.subscription === 'object' && inv.subscription !== null
      ? inv.subscription.metadata?.user_id ?? null
      : null;

  return { userId: fromDetails ?? fromInvoice ?? fromSub ?? null };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
