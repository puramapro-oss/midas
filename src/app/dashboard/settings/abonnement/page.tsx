// =============================================================================
// MIDAS — /dashboard/settings/abonnement (V6 §11)
// Page OBLIGATOIRE : plan + prix + statut + actions (pause / changer / résilier)
// Flow résiliation 3 étapes : pertes → proposition pause → feedback
// =============================================================================

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
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
    .select(
      'plan, billing_period, subscription_status, stripe_subscription_id, subscription_started_at, wallet_balance, prime_total_credited, streak',
    )
    .eq('id', user.id)
    .maybeSingle();

  const { data: tranches } = await supabase
    .from('prime_tranches')
    .select('palier, amount, scheduled_for, credited_at, status')
    .eq('user_id', user.id)
    .order('palier', { ascending: true });

  return { profile, tranches: tranches ?? [] };
}

export default async function AbonnementPage() {
  const { profile, tranches } = await getData();
  return <AbonnementClient profile={profile} tranches={tranches} />;
}
