import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { analyzeTechnical } from '@/lib/agents/technical-agent';
import { fetchKlinesWithSource, MIN_CANDLES } from '@/lib/exchange/binance-public';

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
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { pair, timeframe } = parsed.data;

    const marketData = await fetchKlinesWithSource(pair, timeframe, 300);
    if (marketData.candles.length < MIN_CANDLES) {
      return NextResponse.json({ error: 'Donnees marche insuffisantes; aucune analyse artificielle generee' }, { status: 503 });
    }

    const result = await analyzeTechnical(pair, marketData.candles);

    return NextResponse.json({
      result,
      pair,
      timeframe,
      market_data_source: marketData.source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
