import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchKlinesWithSource } from '@/lib/exchange/binance-public';

const CACHE_MAX_AGE = 60;

const ALLOWED_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
type Timeframe = (typeof ALLOWED_TIMEFRAMES)[number];

const querySchema = z.object({
  pair: z.string().min(1).max(30),
  timeframe: z.enum(ALLOWED_TIMEFRAMES).default('1h'),
  limit: z.coerce.number().int().min(10).max(500).default(200),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      pair: searchParams.get('pair'),
      timeframe: (searchParams.get('timeframe') ?? '1h') as Timeframe,
      limit: searchParams.get('limit') ?? '200',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametres invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { pair, timeframe, limit } = parsed.data;

    // Real data only — Binance direct → VPS proxy → CoinGecko OHLC fallback
    const { candles: rawCandles, source } = await fetchKlinesWithSource(pair, timeframe, limit);

    if (!rawCandles || rawCandles.length === 0) {
      return NextResponse.json(
        { error: 'Données indisponibles pour cette paire', pair, timeframe },
        { status: 503 }
      );
    }

    const candles = rawCandles.map((c) => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    return NextResponse.json(
      { candles, source, pair, timeframe },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
