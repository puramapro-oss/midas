import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import Stripe from 'stripe';
import { PLANS } from '@/lib/stripe/plans';
import type { MidasPlan, BillingPeriod } from '@/types/stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
}

const bodySchema = z.object({
  plan: z.enum(['pro', 'ultra']),
  period: z.enum(['monthly', 'yearly']),
});

const PROMO_COOKIE = 'purama_promo';
const ALLOWED_COUPONS = new Set(['WELCOME50', 'CROSS50']);

type PromoPayload = { coupon: string; source: string; expires: number };

function readPromoCookie(raw: string | undefined): PromoPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PromoPayload>;
    if (
      typeof parsed.coupon !== 'string' ||
      typeof parsed.source !== 'string' ||
      typeof parsed.expires !== 'number'
    ) {
      return null;
    }
    const coupon = parsed.coupon.toUpperCase();
    if (!ALLOWED_COUPONS.has(coupon)) return null;
    if (parsed.expires < Date.now()) return null;
    return { coupon, source: parsed.source, expires: parsed.expires };
  } catch {
    return null;
  }
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

    const stripe = getStripe();
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { plan, period } = parsed.data;
    const planConfig = PLANS[plan as MidasPlan];
    const priceId = planConfig.priceId[period as BillingPeriod];

    if (!priceId) {
      return NextResponse.json({ error: `Aucun price ID configure pour ${plan} ${period}` }, { status: 400 });
    }

    // Fetch profile to get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, stripe_customer_id, referral_code')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: profile.email ?? user.email ?? '',
        metadata: {
          user_id: user.id,
          app: 'midas',
        },
      });

      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const cookieStore = await cookies();
    const promo = readPromoCookie(cookieStore.get(PROMO_COOKIE)?.value);

    const metadata: Record<string, string> = {
      user_id: user.id,
      app: 'midas',
      plan,
      period,
    };

    if (profile.referral_code) {
      metadata.referral_code = profile.referral_code;
    }

    if (promo) {
      metadata.cross_promo_source = promo.source;
      metadata.cross_promo_coupon = promo.coupon;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card', 'paypal', 'link'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/confirmation?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
    };

    if (promo) {
      sessionParams.discounts = [{ coupon: promo.coupon }];
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (promo) {
      await supabase
        .schema('midas')
        .from('cross_promos')
        .insert({
          source_app: promo.source,
          target_app: 'midas',
          user_id: user.id,
          coupon_code: promo.coupon,
          used: true,
        })
        .then(() => undefined, () => undefined);

      cookieStore.set({
        name: PROMO_COOKIE,
        value: '',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        domain: '.purama.dev',
        path: '/',
        maxAge: 0,
      });
    }

    return NextResponse.json({ url: session.url, coupon: promo?.coupon ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
