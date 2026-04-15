import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // V6 — Résiliation : log feedback + set cancel_at_period_end
    if (action === 'cancel') {
      let feedback: string | null = null;
      try {
        const body = await request.json();
        feedback = typeof body?.feedback === 'string' ? body.feedback : null;
      } catch {
        // pas de body JSON — ignoré
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('id', user.id)
        .single();

      const stripe = getStripe();
      if (profile?.stripe_subscription_id) {
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          cancel_at_period_end: true,
          metadata: { cancel_feedback: feedback ?? '' },
        });
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancel_reason: feedback,
          })
          .eq('stripe_subscription_id', profile.stripe_subscription_id);
      }

      if (!profile?.stripe_customer_id) {
        return NextResponse.json({
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/abonnement?cancelled=1`,
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/abonnement?cancelled=1`,
      });
      return NextResponse.json({ url: session.url });
    }

    // Default — portail de gestion abo
    const stripe = getStripe();
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Aucun abonnement Stripe actif' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/abonnement`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
