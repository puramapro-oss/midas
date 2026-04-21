/**
 * MIDAS — Karma Split dispatcher V4.1 Axe 2
 *
 * Orchestrateur appelé par le webhook Stripe `invoice.paid` APRÈS
 * dispatchCommissionsFromStripeInvoice. Prend un Stripe.Invoice, calcule le
 * split 50/10/10/30 et applique atomiquement les 4 increments de pools via
 * la RPC `midas.karma_split_apply`.
 *
 * Contrat critique :
 *  - Ne throw JAMAIS (le webhook doit retourner 200 à Stripe).
 *  - Idempotent : même invoice_id → skip avec raison 'already_processed'.
 *  - Atomique : les 4 pools sont crédités ou aucun (via plpgsql RAISE).
 *  - Retourne KarmaSplitResult structuré pour le log appelant.
 *
 * Voir migrations/v4.1-karma-split.sql §RPC karma_split_apply.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { computeKarmaSplit } from './split';
import type {
  KarmaSplitBreakdown,
  KarmaSplitResult,
  KarmaSplitSkipReason,
} from '@/types/karma';

function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Extrait le user_id best-effort depuis les métadonnées Stripe (dupliqué
 * volontairement pour éviter un import croisé avec commission-engine).
 * Retour null si aucune source n'expose metadata.user_id — pas bloquant
 * (le split va dans des pools globaux, pas dans un wallet user).
 */
function extractUserId(invoice: Stripe.Invoice): string | null {
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

  return fromDetails ?? fromInvoice ?? fromSub ?? null;
}

/** Log skip "défensif" quand on ne peut même pas appeler la RPC (pas d'invoice_id / 0€). */
async function writeSkipLog(
  db: SupabaseClient,
  row: {
    stripe_invoice_id: string;
    stripe_customer_id: string | null;
    user_id: string | null;
    breakdown: KarmaSplitBreakdown;
    skip_reason: KarmaSplitSkipReason;
  },
): Promise<string | undefined> {
  try {
    const res = await db
      .from('karma_split_log')
      .insert({
        stripe_invoice_id: row.stripe_invoice_id,
        stripe_customer_id: row.stripe_customer_id,
        user_id: row.user_id,
        amount_eur_gross: row.breakdown.total_eur,
        split_reward_eur: row.breakdown.reward_eur,
        split_adya_eur: row.breakdown.adya_eur,
        split_asso_eur: row.breakdown.asso_eur,
        split_sasu_eur: row.breakdown.sasu_eur,
        status: 'skipped',
        skip_reason: row.skip_reason,
      })
      .select('id')
      .maybeSingle();
    return res.data?.id ?? undefined;
  } catch {
    // Best-effort — on ne bloque pas le webhook sur un log qui rate.
    return undefined;
  }
}

/**
 * Split un invoice Stripe sur les 4 pools Purama (50/10/10/30).
 *
 * @param invoice   invoice Stripe reçu via webhook `invoice.paid`
 * @param supabase  client Supabase admin (optionnel, défaut = service_role)
 */
export async function dispatchKarmaSplit(
  invoice: Stripe.Invoice,
  supabase?: SupabaseClient,
): Promise<KarmaSplitResult> {
  const db = supabase ?? getAdminClient();

  const invoiceId = invoice.id ?? '';
  const stripeCustomerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
  const userId = extractUserId(invoice);
  const amountCents = invoice.amount_paid ?? 0;

  try {
    // 1. invoice_id requis pour l'idempotence (UNIQUE constraint sur karma_split_log)
    if (!invoiceId) {
      return {
        ok: true,
        status: 'skipped',
        skipReason: 'no_invoice_id',
      };
    }

    // 2. Pas de montant payé → skip (trial, crédit complet, 0€)
    if (!amountCents || amountCents <= 0) {
      const breakdown = computeKarmaSplit(0);
      const logId = await writeSkipLog(db, {
        stripe_invoice_id: invoiceId,
        stripe_customer_id: stripeCustomerId,
        user_id: userId,
        breakdown,
        skip_reason: 'zero_amount',
      });
      return {
        ok: true,
        status: 'skipped',
        skipReason: 'zero_amount',
        logId,
        breakdown,
      };
    }

    // 3. Compute split
    const breakdown = computeKarmaSplit(amountCents);

    // 4. Apply atomically via RPC (idempotent + rollback si pool KO)
    const rpcRes = await db.rpc('karma_split_apply', {
      p_stripe_invoice_id: invoiceId,
      p_stripe_customer_id: stripeCustomerId,
      p_user_id: userId,
      p_amount_eur_gross: breakdown.total_eur,
      p_split_reward_eur: breakdown.reward_eur,
      p_split_adya_eur: breakdown.adya_eur,
      p_split_asso_eur: breakdown.asso_eur,
      p_split_sasu_eur: breakdown.sasu_eur,
    });

    if (rpcRes.error) {
      // RPC a throw (pool inexistant, violation contrainte, etc.) — on loggue
      // best-effort avec status='failed' et le message d'erreur.
      try {
        await db
          .from('karma_split_log')
          .insert({
            stripe_invoice_id: `failed_${invoiceId}_${Date.now()}`,
            stripe_customer_id: stripeCustomerId,
            user_id: userId,
            amount_eur_gross: breakdown.total_eur,
            split_reward_eur: breakdown.reward_eur,
            split_adya_eur: breakdown.adya_eur,
            split_asso_eur: breakdown.asso_eur,
            split_sasu_eur: breakdown.sasu_eur,
            status: 'failed',
            error: rpcRes.error.message,
          });
      } catch { /* best-effort */ }
      return {
        ok: false,
        status: 'failed',
        error: rpcRes.error.message,
        breakdown,
      };
    }

    // rpcRes.data est un tableau d'une ligne { log_id, pool_tx_ids, already_processed }
    const row = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
    const alreadyProcessed: boolean = row?.already_processed ?? false;

    if (alreadyProcessed) {
      return {
        ok: true,
        status: 'skipped',
        skipReason: 'already_processed',
        logId: row?.log_id,
        breakdown,
      };
    }

    return {
      ok: true,
      status: 'ok',
      logId: row?.log_id,
      poolTxIds: (row?.pool_tx_ids ?? []) as string[],
      breakdown,
    };
  } catch (e) {
    // Safety net final — ne doit JAMAIS arriver (RPC ne throw pas via supabase-js),
    // mais double-ceinture pour garantir que le webhook Stripe reçoit 200.
    const msg = e instanceof Error ? e.message : 'unknown';
    return {
      ok: false,
      status: 'failed',
      error: msg,
    };
  }
}
