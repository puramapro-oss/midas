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
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function GET() {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, plan, tier, xp_total, level, streak_days, created_at')
      .eq('id', user.id)
      .single();

    // Fetch all trades
    const { data: trades } = await supabase
      .from('trades')
      .select('pair, side, amount, entry_price, exit_price, pnl, fee, status, strategy, is_paper_trade, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const allTrades = trades ?? [];
    const closedTrades = allTrades.filter((t) => t.status === 'closed');
    const openTrades = allTrades.filter((t) => t.status === 'open');

    // Compute stats
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const totalFees = closedTrades.reduce((sum, t) => sum + (t.fee ?? 0), 0);
    const winningTrades = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
    const losingTrades = closedTrades.filter((t) => (t.pnl ?? 0) < 0);
    const winRate = closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / winningTrades.length
      : 0;

    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losingTrades.length)
      : 0;

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    // Best and worst trade
    const bestTrade = closedTrades.reduce<{ pair: string; pnl: number } | null>((best, t) => {
      if (!best || (t.pnl ?? 0) > best.pnl) return { pair: t.pair, pnl: t.pnl ?? 0 };
      return best;
    }, null);

    const worstTrade = closedTrades.reduce<{ pair: string; pnl: number } | null>((worst, t) => {
      if (!worst || (t.pnl ?? 0) < worst.pnl) return { pair: t.pair, pnl: t.pnl ?? 0 };
      return worst;
    }, null);

    // Strategy breakdown
    const strategyMap: Record<string, { trades: number; pnl: number; wins: number }> = {};
    for (const t of closedTrades) {
      const key = t.strategy ?? 'unknown';
      if (!strategyMap[key]) strategyMap[key] = { trades: 0, pnl: 0, wins: 0 };
      strategyMap[key].trades += 1;
      strategyMap[key].pnl += t.pnl ?? 0;
      if ((t.pnl ?? 0) > 0) strategyMap[key].wins += 1;
    }

    const strategyBreakdown = Object.entries(strategyMap).map(([strategy, data]) => ({
      strategy,
      trades: data.trades,
      pnl: Math.round(data.pnl * 100) / 100,
      winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 10000) / 100 : 0,
    }));

    // Pair breakdown
    const pairMap: Record<string, { trades: number; pnl: number }> = {};
    for (const t of closedTrades) {
      const key = t.pair;
      if (!pairMap[key]) pairMap[key] = { trades: 0, pnl: 0 };
      pairMap[key].trades += 1;
      pairMap[key].pnl += t.pnl ?? 0;
    }

    const pairBreakdown = Object.entries(pairMap)
      .map(([pair, data]) => ({
        pair,
        trades: data.trades,
        pnl: Math.round(data.pnl * 100) / 100,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    // Fetch active bots count
    const { count: activeBots } = await supabase
      .from('bots')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    const report = {
      generatedAt: new Date().toISOString(),
      user: {
        name: profile?.full_name ?? 'Utilisateur',
        email: profile?.email ?? user.email,
        plan: profile?.plan ?? 'free',
        tier: profile?.tier ?? 'bronze',
        level: profile?.level ?? 1,
        memberSince: profile?.created_at ?? null,
      },
      summary: {
        totalTrades: allTrades.length,
        closedTrades: closedTrades.length,
        openPositions: openTrades.length,
        activeBots: activeBots ?? 0,
        totalPnl: Math.round(totalPnl * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        netPnl: Math.round((totalPnl - totalFees) * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
        profitFactor: profitFactor === Infinity ? 'Infinity' : Math.round(profitFactor * 100) / 100,
        avgWin: Math.round(avgWin * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
      },
      bestTrade,
      worstTrade,
      strategyBreakdown,
      pairBreakdown,
    };

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
