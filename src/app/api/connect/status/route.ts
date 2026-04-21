// =============================================================================
// MIDAS — GET /api/connect/status (V4.1)
// Retourne le résumé UI du compte Stripe Connect de l'user courant. Si la
// ligne DB n'est pas complète, refetch Stripe pour rafraîchir les requirements.
// Voir STRIPE_CONNECT_KARMA_V4.md §Stripe Connect.
// =============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceSupabase } from '@supabase/supabase-js';
import { getConnectAccountSummary } from '@/lib/stripe/connect';

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
          /* noop */
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
}

function getServiceSupabase() {
  return createServiceSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const service = getServiceSupabase();
    const summary = await getConnectAccountSummary(service, user.id);
    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erreur interne lors de la lecture du statut Connect';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
