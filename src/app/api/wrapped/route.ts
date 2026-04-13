import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } }
  );
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    // Trades this month
    const { data: trades } = await supabase
      .from('trades')
      .select('id, pnl, strategy, pair, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', firstOfLastMonth)
      .order('created_at', { ascending: false });

    const allTrades = trades ?? [];
    const closedTrades = allTrades.filter((t) => t.status === 'closed');
    const totalPnl = closedTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const wins = closedTrades.filter((t) => (Number(t.pnl) || 0) > 0).length;
    const losses = closedTrades.filter((t) => (Number(t.pnl) || 0) < 0).length;
    const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;

    // Best trade
    const bestTrade = closedTrades.reduce((best, t) => {
      const pnl = Number(t.pnl) || 0;
      return pnl > (Number(best?.pnl) || 0) ? t : best;
    }, closedTrades[0] ?? null);

    // Most traded pair
    const pairCounts: Record<string, number> = {};
    allTrades.forEach((t) => {
      const pair = t.pair as string;
      pairCounts[pair] = (pairCounts[pair] ?? 0) + 1;
    });
    const favoritePair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

    // Most used strategy
    const strategyCounts: Record<string, number> = {};
    allTrades.forEach((t) => {
      const s = t.strategy as string;
      strategyCounts[s] = (strategyCounts[s] ?? 0) + 1;
    });
    const favoriteStrategy = Object.entries(strategyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

    // Profile stats
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak, xp, level, purama_points')
      .eq('id', user.id)
      .single();

    // Achievements unlocked this month
    const { count: achievementsCount } = await supabase
      .from('user_achievements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('unlocked_at', firstOfLastMonth);

    const month = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return NextResponse.json({
      wrapped: {
        month,
        total_trades: allTrades.length,
        closed_trades: closedTrades.length,
        total_pnl: Math.round(totalPnl * 100) / 100,
        wins,
        losses,
        win_rate: winRate,
        best_trade: bestTrade ? {
          pair: bestTrade.pair,
          pnl: Math.round((Number(bestTrade.pnl) || 0) * 100) / 100,
          strategy: bestTrade.strategy,
        } : null,
        favorite_pair: favoritePair,
        favorite_strategy: favoriteStrategy,
        streak: profile?.streak ?? 0,
        xp: profile?.xp ?? 0,
        level: profile?.level ?? 1,
        purama_points: profile?.purama_points ?? 0,
        achievements_unlocked: achievementsCount ?? 0,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
