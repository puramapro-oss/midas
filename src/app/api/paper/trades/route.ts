import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'midas' },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component */ }
        },
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_paper', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ trades: [], stats: emptyStats() });
    }

    const list = trades ?? [];
    const closed = list.filter((t) => t.status === 'closed');
    const wins = closed.filter((t) => Number(t.pnl_usd ?? t.pnl ?? 0) > 0).length;
    const losses = closed.filter((t) => Number(t.pnl_usd ?? t.pnl ?? 0) < 0).length;
    const totalPnl = closed.reduce((s, t) => s + Number(t.pnl_usd ?? t.pnl ?? 0), 0);
    const open = list.filter((t) => t.status === 'open').length;

    return NextResponse.json({
      trades: list,
      stats: {
        total: list.length,
        open,
        closed: closed.length,
        wins,
        losses,
        winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0,
        totalPnl,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg, trades: [], stats: emptyStats() }, { status: 500 });
  }
}

function emptyStats() {
  return { total: 0, open: 0, closed: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0 };
}
