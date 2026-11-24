import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { readPaperTrades, summarizeRecordedTrades } from '@/lib/trading/recorded-performance';

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

    const asOf = Date.now();
    const [{ data: profile, error: profileError }, allTrades] = await Promise.all([
      supabase.from('profiles').select('full_name, plan, created_at').eq('id', user.id).single(),
      readPaperTrades(supabase, user.id, asOf),
    ]);
    if (profileError || !profile) throw new Error('Profil indisponible');
    const stats = summarizeRecordedTrades(allTrades, asOf);
    const closed = allTrades.filter(t => t.status === 'closed');
    const strategyMap = new Map<string, { trades: number; pnl: number; wins: number }>();
    const pairMap = new Map<string, { trades: number; pnl: number }>();
    let bestTrade: { pair: string; pnl: number } | null = null;
    let worstTrade: { pair: string; pnl: number } | null = null;
    for (const t of closed) {
      const pnl = Number(t.pnl) - Number(t.fees); // Already validated by the shared summary.
      const strategy = strategyMap.get(t.strategy) ?? { trades: 0, pnl: 0, wins: 0 };
      strategy.trades++; strategy.pnl += pnl; if (pnl > 0) strategy.wins++;
      strategyMap.set(t.strategy, strategy);
      const pair = pairMap.get(t.pair) ?? { trades: 0, pnl: 0 };
      pair.trades++; pair.pnl += pnl; pairMap.set(t.pair, pair);
      if (!bestTrade || pnl > bestTrade.pnl) bestTrade = { pair: t.pair, pnl };
      if (!worstTrade || pnl < worstTrade.pnl) worstTrade = { pair: t.pair, pnl };
    }
    return NextResponse.json({
      generatedAt: new Date().toISOString(), asOf: new Date(asOf).toISOString(),
      scope: { mode: 'paper', currency: 'USDT', pnlBasis: 'realized_net_of_recorded_fees',
        completenessChecked: true, atomicSnapshot: false, maximumPositions: 10000 },
      user: { name: profile.full_name ?? 'Utilisateur', email: user.email,
        plan: profile.plan, memberSince: profile.created_at },
      summary: {
        totalTrades: allTrades.length, closedTrades: stats.totalTrades,
        openPositions: allTrades.filter(t => t.status === 'open').length,
        totalPnl: stats.grossPnl, totalFees: stats.totalFees, netPnl: stats.totalPnl,
        winRate: stats.winRate, profitFactor: stats.profitFactor,
        avgWin: stats.avgWin, avgLoss: stats.avgLoss, breakevenTrades: stats.breakevenTrades,
        realizedDrawdownUsdt: stats.maxDrawdown, periodPnl: stats.periodPnl,
      },
      bestTrade, worstTrade,
      strategyBreakdown: [...strategyMap].map(([strategy, data]) => ({
        strategy, ...data, winRate: data.wins / data.trades * 100,
      })),
      pairBreakdown: [...pairMap].map(([pair, data]) => ({ pair, ...data })).sort((a, b) => b.pnl - a.pnl),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rapport indisponible';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
