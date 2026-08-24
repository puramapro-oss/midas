import Stripe from 'stripe';
import { PLANS, getPlanByPriceId } from '@/lib/stripe/plans';
import type { SupabaseClient } from '@supabase/supabase-js';

type AdminSupabase = SupabaseClient;

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  adminSupabase: AdminSupabase
) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const planInfo = priceId ? getPlanByPriceId(priceId) : null;

  await adminSupabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      plan: planInfo?.plan ?? null,
      billing_period: planInfo?.period ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' }
  );
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  adminSupabase: AdminSupabase
) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return;

  const planInfo = getPlanByPriceId(priceId);
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  const updateData: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    subscription_status: subscription.status,
    updated_at: new Date().toISOString(),
  };

  if (planInfo && isActive) {
    updateData.plan = planInfo.plan;
    updateData.billing_period = planInfo.period;
    updateData.daily_questions_limit = PLANS[planInfo.plan].limits.dailyQuestions;
  }

  await adminSupabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  adminSupabase: AdminSupabase
) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  await adminSupabase
    .from('profiles')
    .update({
      plan: 'free',
      billing_period: null,
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      daily_questions_limit: PLANS.free.limits.dailyQuestions,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  await adminSupabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  await adminSupabase
    .from('prime_tranches')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'scheduled');
}
