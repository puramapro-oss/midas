// MIDAS — V7 §15 BLOC 1/2 : stats filleuls (count + gains cumulés)
// Utilisé par ReferralBlock + AmbassadeurBlock above the fold.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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
        setAll() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function GET() {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .schema('midas')
      .from('referrals')
      .select('id, status, total_earned')
      .eq('referrer_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Erreur base de donnees' }, { status: 500 });
    }

    const all = rows ?? [];
    const converted = all.filter((r) => r.status === 'converted' || r.status === 'rewarded');
    const totalEarned = all.reduce(
      (sum, r) => sum + Number((r as { total_earned?: number | string }).total_earned ?? 0),
      0
    );

    return NextResponse.json({
      count: converted.length,
      pending: all.length - converted.length,
      total_earned: totalEarned,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
