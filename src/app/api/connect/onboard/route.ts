// =============================================================================
// MIDAS — POST /api/connect/onboard (V4.1)
// Crée (ou retourne) le compte Stripe Connect Express de l'user authentifié.
// Idempotent : relancer l'appel sur un user déjà onboardé = retourne l'existant.
// Voir STRIPE_CONNECT_KARMA_V4.md §Stripe Connect.
// =============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceSupabase } from '@supabase/supabase-js';
import { ensureConnectAccount, getConnectAccountRow } from '@/lib/stripe/connect';
import type { ConnectOnboardResponse } from '@/types/stripe';

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* noop — route serveur */
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}

function getServiceSupabase() {
  return createServiceSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST() {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Service client = seul à pouvoir appeler la RPC upsert_connect_account
    // (SECURITY DEFINER, GRANT EXECUTE TO service_role).
    const service = getServiceSupabase();

    // 1. Déjà un compte ? On retourne tel quel (idempotent).
    const existing = await getConnectAccountRow(service, user.id);
    if (existing) {
      const response: ConnectOnboardResponse = {
        stripe_account_id: existing.stripe_account_id,
        onboarding_completed: existing.onboarding_completed,
        details_submitted: existing.details_submitted,
        payouts_enabled: existing.payouts_enabled,
      };
      return NextResponse.json(response);
    }

    // 2. Récupérer l'email depuis le profil (source de vérité MIDAS).
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const email = profile.email ?? user.email;
    if (!email) {
      return NextResponse.json(
        { error: 'Email utilisateur manquant — impossible de créer le compte Connect' },
        { status: 400 },
      );
    }

    // 3. Création côté Stripe + upsert DB (via RPC idempotent).
    const account = await ensureConnectAccount(service, {
      userId: user.id,
      email,
    });

    const response: ConnectOnboardResponse = {
      stripe_account_id: account.stripe_account_id,
      onboarding_completed: account.onboarding_completed,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne lors de l\'onboarding Connect';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
