import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchKlinesWithSource } from '@/lib/exchange/binance-public';

const CACHE_MAX_AGE = 60;

const ALLOWED_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
type Timeframe = (typeof ALLOWED_TIMEFRAMES)[number];

const querySchema = z.object({
  pair: z.string().trim().regex(/^[A-Z0-9]{1,15}(?:\/[A-Z0-9]{1,15})?$/i),
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

    // Only observations matching the requested pair, interval and volume contract.
    const market = await fetchKlinesWithSource(pair, timeframe, limit);
    const { candles: rawCandles, source } = market;

    if (!rawCandles || rawCandles.length === 0) {
      return NextResponse.json(
        { error: 'Données indisponibles pour cette paire', pair, timeframe, reason: market.unavailable_reason },
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
      { candles, source, pair: market.pair, timeframe, timestamp_basis: market.timestamp_basis,
        volume_available: market.volume_available, fetched_at: market.fetched_at,
        latest_candle_open_time: candles[candles.length - 1].timestamp },
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
