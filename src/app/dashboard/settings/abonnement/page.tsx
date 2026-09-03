// =============================================================================
// MIDAS — /dashboard/settings/abonnement (V6 §11)
// Page OBLIGATOIRE : plan + prix + statut + actions (pause / changer / résilier)
// Échelle anti-résiliation complète (RETENTION-BRIEF.md §2, @purama/retention).
//
// D-MI01 (2026-09-03) : la requête précédente sélectionnait billing_period,
// subscription_status, subscription_started_at, wallet_balance,
// prime_total_credited, streak — AUCUNE de ces colonnes n'existe sur
// public.profiles (vérifié en direct sur le VPS, information_schema.columns).
// PostgREST renvoyait donc une erreur sur chaque chargement, `profile` restait
// `null`, et cette page affichait "Chargement…" à l'infini en production —
// jamais de résiliation possible depuis l'UI. Corrigé : colonnes réelles
// (plan, plan_period, stripe_subscription_id, streak_days), statut résolu en
// direct sur Stripe (source de vérité, pas de colonne locale fiable).
// `prime_tranches` : table absente elle aussi (to_regclass NULL) — feature non
// construite, hors périmètre de ce chantier, section masquée si vide (déjà le
// comportement existant, aucune régression).
// =============================================================================

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe/client';
import AbonnementClient from './AbonnementClient';

export const metadata: Metadata = {
  title: 'Mon abonnement — MIDAS',
};

async function getData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/settings/abonnement');

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_period, stripe_subscription_id, streak_days')
    .eq('id', user.id)
    .maybeSingle();

  let subscriptionStatus: string | null = null;
  let cancelAtPeriodEnd = false;
  let currentPeriodEnd: string | null = null;

  if (profile?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      subscriptionStatus = sub.status;
      const subAny = sub as unknown as { cancel_at_period_end?: boolean; current_period_end?: number };
      cancelAtPeriodEnd = subAny.cancel_at_period_end ?? false;
      currentPeriodEnd = subAny.current_period_end ? new Date(subAny.current_period_end * 1000).toISOString() : null;
    } catch {
      // Abonnement Stripe introuvable — statut reste null, UI affiche "Gratuit"
    }
  }

  return {
    profile: profile
      ? {
          plan: profile.plan,
          planPeriod: profile.plan_period,
          streakDays: profile.streak_days ?? 0,
          subscriptionStatus,
          cancelAtPeriodEnd,
          currentPeriodEnd,
        }
      : null,
  };
}

export default async function AbonnementPage() {
  const { profile } = await getData();
  return <AbonnementClient profile={profile} />;
}
