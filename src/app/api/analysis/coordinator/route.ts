import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { coordinate } from '@/lib/ai/coordinator';
import { getPhase } from '@/lib/phase';
import { fetchKlinesWithSource } from '@/lib/exchange/binance-public';

const bodySchema = z.object({
  pair: z.string().min(1).max(30),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).default('4h'),
});

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

export async function POST(request: Request) {
  try {
    if (!getPhase().personalizedCryptoAdvice) {
      return NextResponse.json(
        {
          error: 'Les décisions personnalisées sont désactivées. MIDAS fournit uniquement des analyses éducatives générales.',
          policy: 'D2=A',
        },
        { status: 403 },
      );
    }
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { pair, timeframe } = parsed.data;

    // Fetch profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, plan, daily_trades_used')
      .eq('id', user.id)
      .single();

    // Count open positions
    const { count: openPositions } = await supabase
      .from('trades')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'open');

    const marketData = await fetchKlinesWithSource(pair, timeframe, 300);
    if (marketData.candles.length < 200) {
      return NextResponse.json(
        { error: 'Donnees marche insuffisantes; aucune analyse artificielle generee' },
        { status: 503 },
      );
    }

    const decision = await coordinate({
      pair,
      candles: marketData.candles,
      account_balance: 10000,
      current_drawdown_pct: 0,
      open_positions: openPositions ?? 0,
      daily_trades_count: profile?.daily_trades_used ?? 0,
    });

    return NextResponse.json({ decision, pair, timeframe, market_data_source: marketData.source });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
