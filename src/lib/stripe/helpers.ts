import { stripe } from '@/lib/stripe/client';
import { PLANS, getPlanByPriceId, type MidasPlan, type BillingPeriod } from '@/lib/stripe/plans';
import { createServiceClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';
import type Stripe from 'stripe';

export function getUserPlan(profile: Pick<Profile, 'plan'>): MidasPlan {
  const plan = profile.plan;
  if (plan === 'pro' || plan === 'ultra') return plan;
  return 'free';
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: MidasPlan,
  period: BillingPeriod,
  referralCode?: string,
): Promise<Stripe.Checkout.Session> {
  const planConfig = PLANS[plan];
  const priceId = planConfig.priceId[period];

  if (!priceId) {
    throw new Error(`No price ID configured for ${plan} ${period}`);
  }

  const metadata: Record<string, string> = {
    user_id: userId,
    app: 'midas',
    plan,
    period,
  };

  if (referralCode) {
    metadata.referral_code = referralCode;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'paypal', 'link'],
    customer_email: email,
    allow_promotion_codes: true,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata,
    subscription_data: {
      metadata,
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
  });

  return session;
}

export async function createCustomerPortalSession(
  customerId: string,
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings`,
  });

  return session;
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
): Promise<void> {
  const supabase = createServiceClient();

  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return;

  const planInfo = getPlanByPriceId(priceId);

  const status = subscription.status;
  const isActive = status === 'active' || status === 'trialing';

  const updateData: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    subscription_status: status,
    updated_at: new Date().toISOString(),
  };

  if (planInfo && isActive) {
    updateData.plan = planInfo.plan;
    updateData.billing_period = planInfo.period;
    updateData.daily_questions_limit = PLANS[planInfo.plan].limits.dailyQuestions;
  }

  if (status === 'canceled' || status === 'unpaid') {
    updateData.plan = 'free';
    updateData.billing_period = null;
    updateData.daily_questions_limit = PLANS.free.limits.dailyQuestions;
  }

  await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);
}
