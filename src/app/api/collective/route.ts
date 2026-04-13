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

// GET — aggregate anonymous signals from all MIDAS users
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // last 24h

    // Aggregate signals from all users (anonymous)
    const { data: recentSignals } = await supabase
      .from('signals')
      .select('pair, signal_type, confidence, strategy, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200);

    const signals = recentSignals ?? [];

    // Aggregate by pair
    const pairAgg: Record<string, { buy: number; sell: number; hold: number; total: number; avgConfidence: number }> = {};

    signals.forEach((s) => {
      const pair = s.pair as string;
      if (!pairAgg[pair]) {
        pairAgg[pair] = { buy: 0, sell: 0, hold: 0, total: 0, avgConfidence: 0 };
      }
      const agg = pairAgg[pair];
      agg.total++;
      const type = s.signal_type as string;
      if (type === 'buy') agg.buy++;
      else if (type === 'sell') agg.sell++;
      else agg.hold++;
      agg.avgConfidence += Number(s.confidence) || 0;
    });

    // Calculate averages and consensus
    const collective = Object.entries(pairAgg)
      .map(([pair, agg]) => {
        const avgConf = agg.total > 0 ? Math.round(agg.avgConfidence / agg.total) : 0;
        const buyPct = agg.total > 0 ? Math.round((agg.buy / agg.total) * 100) : 0;
        const sellPct = agg.total > 0 ? Math.round((agg.sell / agg.total) * 100) : 0;
        const holdPct = 100 - buyPct - sellPct;

        let consensus: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell' = 'neutral';
        if (buyPct >= 70) consensus = 'strong_buy';
        else if (buyPct >= 55) consensus = 'buy';
        else if (sellPct >= 70) consensus = 'strong_sell';
        else if (sellPct >= 55) consensus = 'sell';

        return {
          pair,
          signals_count: agg.total,
          buy_pct: buyPct,
          sell_pct: sellPct,
          hold_pct: holdPct,
          avg_confidence: avgConf,
          consensus,
        };
      })
      .sort((a, b) => b.signals_count - a.signals_count)
      .slice(0, 20);

    // Global sentiment
    const totalBuy = signals.filter((s) => s.signal_type === 'buy').length;
    const totalSell = signals.filter((s) => s.signal_type === 'sell').length;
    const globalSentiment = signals.length > 0
      ? Math.round(((totalBuy - totalSell) / signals.length) * 100)
      : 0;

    return NextResponse.json({
      collective,
      global_sentiment: globalSentiment, // -100 to +100
      total_signals_24h: signals.length,
      active_pairs: Object.keys(pairAgg).length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
