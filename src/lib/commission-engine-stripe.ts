// =============================================================================
// MIDAS — Commission Engine: Stripe Integration
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { dispatchCommissions } from './commission-engine';
import { getAdminClient, extractInvoiceMetadata, writeLog } from './commission-engine-helpers';
import type {
  StripeDispatchResult,
  PartnerReferralRow,
} from './commission-engine-types';

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
