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

export async function dispatchCommissions(
  event: CommissionEvent,
  supabase?: SupabaseClient,
): Promise<{ ok: true; rows: CommissionRow[] } | { ok: false; error: string }> {
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

    if (rows.length === 0) return { ok: true, rows: [] };

    const { error } = await db.from('partner_commissions').insert(rows);
    if (error) return { ok: false, error: error.message };

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

    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
