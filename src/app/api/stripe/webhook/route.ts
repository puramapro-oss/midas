import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PLANS, getPlanByPriceId } from '@/lib/stripe/plans';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
}

function getAdminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret non configure' }, { status: 500 });
    }

    const stripe = getStripe();
    const adminSupabase = getAdminSupabase();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (!userId) break;

        // Retrieve subscription to get price ID
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price?.id;

          if (priceId) {
            const planInfo = getPlanByPriceId(priceId);

            if (planInfo) {
              await adminSupabase
                .from('profiles')
                .update({
                  plan: planInfo.plan,
                  billing_period: planInfo.period,
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: subscription.id,
                  subscription_status: 'active',
                  daily_questions_limit: PLANS[planInfo.plan].limits.dailyQuestions,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', userId);
            }
          }
        }

        // Record payment
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
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
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
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
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
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) break;

        const priceId = subscription.items.data[0]?.price?.id;
        if (!priceId) break;

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
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) break;

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
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
