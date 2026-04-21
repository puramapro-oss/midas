// =============================================================================
// MIDAS — GET /api/wallet/balance (V4.1 Axe 3)
//
// Retourne le solde wallet V6 (midas.profiles.wallet_balance) pour l'user
// authentifié. Utilise la RPC get_wallet_balance (SECURITY DEFINER) pour
// contourner l'absence d'exposition PostgREST du schéma midas.
//
// Réponse : { balance_eur: number, currency: 'EUR' }
// =============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
  return user;
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const service = createServiceSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await service.rpc('get_wallet_balance', {
      p_user_id: user.id,
    });

    if (error) {
      return NextResponse.json(
        { error: `Lecture du solde impossible : ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      balance_eur: Number(data ?? 0),
      currency: 'EUR',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
