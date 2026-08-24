import Stripe from 'stripe';
import { PLANS, getPlanByPriceId } from '@/lib/stripe/plans';
import { PRIME_TRANCHE_1, PRIME_TRANCHE_2, PRIME_TRANCHE_3 } from '@/lib/constants/prime';
import type { SupabaseClient } from '@supabase/supabase-js';

type AdminSupabase = SupabaseClient;

export async function handleCheckoutCompletedFulfillment(
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

        const { data: existingT1 } = await adminSupabase
          .from('prime_tranches')
          .select('id')
          .eq('user_id', userId)
          .eq('app_id', 'midas')
          .eq('palier', 1)
          .maybeSingle();

        if (!existingT1) {
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
