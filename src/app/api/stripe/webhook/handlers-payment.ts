import Stripe from 'stripe';
import { PLANS, getPlanByPriceId } from '@/lib/stripe/plans';
import { dispatchCommissionsFromStripeInvoice } from '@/lib/commission-engine';
import { dispatchKarmaSplit } from '@/lib/karma/dispatch';
import { PRIME_TRANCHE_1, PRIME_TRANCHE_2, PRIME_TRANCHE_3 } from '@/lib/constants/prime';
import type { SupabaseClient } from '@supabase/supabase-js';

type AdminSupabase = SupabaseClient;

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  adminSupabase: AdminSupabase
) {
  const userId = session.metadata?.user_id;
  if (!userId) return;

  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = subscription.items.data[0]?.price?.id;

    if (priceId) {
      const planInfo = getPlanByPriceId(priceId);

      if (planInfo) {
        const now = new Date();
        await adminSupabase
          .from('profiles')
          .update({
            plan: planInfo.plan,
            billing_period: planInfo.period,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            subscription_status: 'active',
            subscription_started_at: now.toISOString(),
            daily_questions_limit: PLANS[planInfo.plan].limits.dailyQuestions,
            updated_at: now.toISOString(),
          })
          .eq('id', userId);

        await adminSupabase.from('subscriptions').upsert({
          user_id: userId,
          app_id: 'midas',
          stripe_subscription_id: subscription.id,
          stripe_customer_id: session.customer as string,
          status: 'active',
          plan: planInfo.plan,
          started_at: now.toISOString(),
        }, { onConflict: 'stripe_subscription_id' });

        const t1 = PRIME_TRANCHE_1;
        const m1 = new Date(now); m1.setMonth(m1.getMonth() + 1);
        const m2 = new Date(now); m2.setMonth(m2.getMonth() + 2);

        await adminSupabase.from('prime_tranches').insert([
          { user_id: userId, app_id: 'midas', palier: 1, amount: t1, scheduled_for: now.toISOString(), credited_at: now.toISOString(), status: 'credited' },
          { user_id: userId, app_id: 'midas', palier: 2, amount: PRIME_TRANCHE_2, scheduled_for: m1.toISOString(), status: 'scheduled' },
          { user_id: userId, app_id: 'midas', palier: 3, amount: PRIME_TRANCHE_3, scheduled_for: m2.toISOString(), status: 'scheduled' },
        ]);

        await adminSupabase.rpc('increment_wallet_balance', { uid: userId, delta: t1 });
      }
    }
  }

  if (session.amount_total) {
    await adminSupabase.from('payments').insert({
      user_id: userId,
      stripe_payment_id: session.payment_intent as string,
      amount: session.amount_total,
      amount_after_discount: session.amount_total - (session.total_details?.amount_discount ?? 0),
      discount_applied: session.total_details?.amount_discount ?? 0,
      currency: session.currency ?? 'eur',
      status: 'completed',
      plan: session.metadata?.plan ?? 'pro',
      billing_period: session.metadata?.period ?? 'monthly',
    });
  }
}

export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  adminSupabase: AdminSupabase
) {
  const subscriptionId = String((invoice as unknown as Record<string, unknown>).subscription ?? '');

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;

    if (userId) {
      await adminSupabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      const invoiceWithMeta = invoice as Stripe.Invoice & {
        subscription_details?: { metadata?: Record<string, string> | null };
      };
      invoiceWithMeta.subscription_details = {
        metadata: { user_id: userId },
      };
    }
  }

  try {
    await dispatchCommissionsFromStripeInvoice(invoice, adminSupabase);
  } catch {
    // Safety net
  }

  try {
    await dispatchKarmaSplit(invoice, adminSupabase);
  } catch {
    // Safety net
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  adminSupabase: AdminSupabase
) {
  const subscriptionId = String((invoice as unknown as Record<string, unknown>).subscription ?? '');

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;

    if (userId) {
      await adminSupabase
        .from('profiles')
        .update({
          subscription_status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }
  }
}

export async function handleChargeRefunded(
  charge: Stripe.Charge,
  adminSupabase: AdminSupabase
) {
  const userId = (charge.metadata?.user_id) ?? null;
  if (!userId) return;

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('subscription_started_at')
    .eq('id', userId)
    .maybeSingle();

  const startedAt = profile?.subscription_started_at
    ? new Date(profile.subscription_started_at).getTime()
    : null;
  const within30j = startedAt && (Date.now() - startedAt) < 30 * 24 * 60 * 60 * 1000;

  const { data: tranches } = await adminSupabase
    .from('prime_tranches')
    .select('amount')
    .eq('user_id', userId)
    .eq('status', 'credited');
  const primeCredited = (tranches ?? []).reduce((s, t) => s + Number(t.amount ?? 0), 0);

  await adminSupabase.from('retractions').insert({
    user_id: userId,
    app_id: 'midas',
    amount_refunded: (charge.amount_refunded ?? 0) / 100,
    prime_deducted: within30j ? primeCredited : 0,
    processed: true,
    processed_at: new Date().toISOString(),
    notes: within30j ? 'Annulation <30j — prime déduite (Art. L221-28 3°)' : 'Remboursement hors fenêtre prime',
  });
}
