// MIDAS — Adapter @purama/retention (MOULE-RETENTION.md §1). Pilote #10.
// Pas de table `subscriptions` locale (grep confirmé absente en live, cf DECISIONS.md
// D-MI01) : `public.profiles` est la source de vérité pour plan/stripe ids, Stripe
// reste la source de vérité pour le statut/dates live de l'abonnement.

import { isEligibleForDiscount50 } from '@purama/retention';
import { stripe } from './stripe/client';
import { createServiceClient } from './supabase/server';
import { PLANS, type MidasPlan } from './stripe/plans';

const SAVE50_COUPON_ID = 'WEw79rus'; // coupon partagé écosystème, réutilisé (vérifié live : repeating/3 mois/50%)

type ProfileRow = {
  plan: MidasPlan;
  plan_period: 'monthly' | 'yearly';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

async function getProfile(userId: string): Promise<ProfileRow | null> {
  const service = createServiceClient();
  const { data } = await service
    .from('profiles')
    .select('plan, plan_period, stripe_customer_id, stripe_subscription_id')
    .eq('id', userId)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

export async function getAccountCreatedAt(userId: string): Promise<Date> {
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error('Compte introuvable.');
  return new Date(data.user.created_at);
}

export async function getOfferUsedAt(userId: string): Promise<Date | null> {
  const service = createServiceClient();
  const { data } = await service
    .schema('midas')
    .from('promo_codes_log')
    .select('applied_at')
    .eq('user_id', userId)
    .eq('code', 'SAVE50')
    .maybeSingle();
  return data?.applied_at ? new Date(data.applied_at) : null;
}

/** Début de l'abonnement payant actif — résolu en direct sur Stripe (pas de colonne
 * locale fiable, cf D-MI01), jamais inventé. */
export async function getActiveSince(userId: string): Promise<Date | null> {
  const profile = await getProfile(userId);
  if (!profile?.stripe_subscription_id) return null;
  try {
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const startDate = (sub as unknown as { start_date?: number }).start_date;
    if (!startDate || (sub.status !== 'active' && sub.status !== 'trialing')) return null;
    return new Date(startDate * 1000);
  } catch {
    return null;
  }
}

export interface RetentionEligibility {
  eligible: boolean;
  reason: string;
  profile: ProfileRow;
}

/** Résout l'éligibilité réelle -50%x3 pour l'abo actif du user. Jette si pas d'abo. */
export async function resolveEligibility(userId: string): Promise<RetentionEligibility> {
  const profile = await getProfile(userId);
  if (!profile?.stripe_subscription_id) throw new Error('Abonnement introuvable.');

  const [accountCreatedAt, offerUsedAt, activeSince] = await Promise.all([
    getAccountCreatedAt(userId),
    getOfferUsedAt(userId),
    getActiveSince(userId),
  ]);

  const { eligible, reason } = isEligibleForDiscount50({
    accountCreatedAt,
    offerUsedAt,
    activeSince,
    now: new Date(),
  });

  return { eligible, reason, profile };
}

/** Applique -50%x3 (SAVE50) — verrou DB user_id AVANT tout appel Stripe. */
export async function applyDiscount50(userId: string): Promise<{ applied: boolean; message: string }> {
  const { eligible, reason, profile } = await resolveEligibility(userId);
  if (!eligible) return { applied: false, message: reason };

  const service = createServiceClient();
  const lock = await service
    .schema('midas')
    .from('promo_codes_log')
    .insert({ user_id: userId, code: 'SAVE50', stripe_coupon_id: SAVE50_COUPON_ID, discount_pct: 50, context: 'retention' })
    .select('id')
    .single();

  if (lock.error) {
    return { applied: false, message: 'Tu as déjà profité de cette offre.' };
  }

  try {
    await stripe.subscriptions.update(profile.stripe_subscription_id!, {
      discounts: [{ coupon: SAVE50_COUPON_ID }],
      cancel_at_period_end: false,
    });
  } catch (err) {
    await service.schema('midas').from('promo_codes_log').delete().eq('id', lock.data!.id);
    throw err;
  }

  return { applied: true, message: 'Offre appliquée — ton prochain prélèvement sera à -50% pendant 3 mois.' };
}

/** Pause Stripe (pause_collection), 1 à 3 mois, garde tout, zéro prélèvement. */
export async function pauseSubscription(userId: string, months: 1 | 2 | 3): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile?.stripe_subscription_id) throw new Error('Abonnement introuvable.');
  const resumesAt = Math.floor(Date.now() / 1000) + months * 30 * 24 * 60 * 60;
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    pause_collection: { behavior: 'void', resumes_at: resumesAt },
  });
}

/** Descente de palier RÉELLE : ultra -> pro uniquement (seul palier payant inférieur
 * qui existe chez MIDAS, D-MI02). Jamais un palier free (pas un "palier" Stripe). */
export async function downgradeTier(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile?.stripe_subscription_id) throw new Error('Abonnement introuvable.');
  if (profile.plan !== 'ultra') throw new Error('Aucun palier inférieur payant disponible.');

  const stripeSub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  const itemId = stripeSub.items.data[0]?.id;
  if (!itemId) throw new Error('Ligne d’abonnement introuvable.');
  const targetPriceId = PLANS.pro.priceId[profile.plan_period];
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    items: [{ id: itemId, price: targetPriceId }],
    proration_behavior: 'none',
  });
}

/** Bascule vers le prix annuel déjà gravé du palier actuel (PLANS[plan].priceId.yearly). */
export async function applyAnnualDiscount(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile?.stripe_subscription_id) throw new Error('Abonnement introuvable.');
  if (profile.plan === 'free') throw new Error('Aucun abonnement payant actif.');

  const stripeSub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  const itemId = stripeSub.items.data[0]?.id;
  if (!itemId) throw new Error('Ligne d’abonnement introuvable.');
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    items: [{ id: itemId, price: PLANS[profile.plan].priceId.yearly }],
    proration_behavior: 'none',
  });
}

/** Pose cancel_at_period_end=true EN INTERNE (jamais une simple délégation au Portal),
 * journalise le motif. Accès conservé jusqu'à fin de période. */
export async function recordCancelWithFeedback(userId: string, reason: string): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile?.stripe_subscription_id) throw new Error('Abonnement introuvable.');

  await stripe.subscriptions.update(profile.stripe_subscription_id, { cancel_at_period_end: true });
  await logRetentionEvent(userId, 'feedback', 'accepted', { reason });
}

export async function logRetentionEvent(
  userId: string,
  step: 'pertes' | 'pause' | 'palier' | 'annuel' | 'discount50' | 'feedback',
  action: 'viewed' | 'accepted' | 'declined',
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const service = createServiceClient();
  await service.schema('midas').from('retention_events').insert({ user_id: userId, step, action, metadata });
}

/** Compte réel de filleuls actifs (pour l'écran "pertes réelles") — jamais inventé,
 * masqué côté UI si 0. */
export async function getActiveReferralsCount(userId: string): Promise<number> {
  const service = createServiceClient();
  const { count } = await service
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .not('converted_at', 'is', null);
  return count ?? 0;
}
