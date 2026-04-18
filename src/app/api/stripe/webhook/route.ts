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

              // V6 — Upsert subscriptions row
              await adminSupabase.from('subscriptions').upsert({
                user_id: userId,
                app_id: 'midas',
                stripe_subscription_id: subscription.id,
                stripe_customer_id: session.customer as string,
                status: 'active',
                plan: planInfo.plan,
                started_at: now.toISOString(),
              }, { onConflict: 'stripe_subscription_id' });

              // V6 — Prime 100€ en 3 tranches (J+0 25€ | M+1 25€ | M+2 50€)
              // Crédit immédiat tranche 1
              const t1 = 25;
              const m1 = new Date(now); m1.setMonth(m1.getMonth() + 1);
              const m2 = new Date(now); m2.setMonth(m2.getMonth() + 2);

              await adminSupabase.from('prime_tranches').insert([
                { user_id: userId, app_id: 'midas', palier: 1, amount: t1, scheduled_for: now.toISOString(), credited_at: now.toISOString(), status: 'credited' },
                { user_id: userId, app_id: 'midas', palier: 2, amount: 25, scheduled_for: m1.toISOString(), status: 'scheduled' },
                { user_id: userId, app_id: 'midas', palier: 3, amount: 50, scheduled_for: m2.toISOString(), status: 'scheduled' },
              ]);

              // Créditer tranche 1 dans wallet_balance
              await adminSupabase.rpc('increment_wallet_balance', { uid: userId, delta: t1 });
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

      case 'customer.subscription.created': {
        // Brief V7 §21 : safety net si checkout.session.completed manqué.
        // Sync minimum la subscription row dans Supabase (idempotent).
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (!userId) break;

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

        // V6 — marquer subscription cancelled + annuler tranches futures
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
        break;
      }

      case 'charge.refunded': {
        // V6 — rétractation <30j : déduire prime versée du remboursement
        const charge = event.data.object as Stripe.Charge;
        const userId = (charge.metadata?.user_id) ?? null;
        if (!userId) break;

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
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
