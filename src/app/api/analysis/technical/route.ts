import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { analyzeTechnical } from '@/lib/agents/technical-agent';
import type { Candle } from '@/lib/agents/types';

const bodySchema = z.object({
  pair: z.string().min(1).max(30),
  timeframe: z.string().default('4h'),
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

function generateCandles(pair: string, count: number): Candle[] {
  const basePrice = pair.includes('BTC') ? 65000 : pair.includes('ETH') ? 3400 : pair.includes('SOL') ? 140 : 1;
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * 4 * 60 * 60 * 1000;
    const volatility = basePrice * 0.015;
    const change = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;
    const volume = basePrice * (300 + Math.random() * 1500);

    candles.push({
      timestamp,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2)),
    });

    price = close;
  }

  return candles;
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

    // Generate candle data (in production, fetch from exchange or cache)
    const candles = generateCandles(pair, 300);

    const result = await analyzeTechnical(pair, candles);

    return NextResponse.json({
      result,
      pair,
      timeframe,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
