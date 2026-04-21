// =============================================================================
// MIDAS — POST /api/connect/account-session (V4.1)
// Retourne un client_secret pour initialiser ConnectComponentsProvider côté
// client. AccountSession Stripe = 30 min de validité, à rafraîchir au besoin.
// Voir STRIPE_CONNECT_KARMA_V4.md §Stripe Connect.
// =============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceSupabase } from '@supabase/supabase-js';
import {
  createConnectAccountSession,
  getConnectAccountRow,
} from '@/lib/stripe/connect';

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

export async function POST() {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const service = getServiceSupabase();
    const account = await getConnectAccountRow(service, user.id);

    if (!account) {
      return NextResponse.json(
        {
          error:
            'Aucun compte Stripe Connect trouvé — lance /api/connect/onboard avant de demander une session.',
        },
        { status: 409 },
      );
    }

    const session = await createConnectAccountSession(account.stripe_account_id);
    return NextResponse.json(session);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erreur interne lors de la création de la session Connect';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
