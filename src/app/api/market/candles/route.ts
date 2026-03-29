import { NextResponse } from 'next/server';
import { z } from 'zod';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_MAX_AGE = 120;

const PAIR_TO_COINGECKO: Record<string, string> = {
  'BTC/USDT': 'bitcoin',
  'ETH/USDT': 'ethereum',
  'SOL/USDT': 'solana',
  'ADA/USDT': 'cardano',
  'DOT/USDT': 'polkadot',
  'LINK/USDT': 'chainlink',
  'AVAX/USDT': 'avalanche-2',
  'MATIC/USDT': 'polygon',
  'BNB/USDT': 'binancecoin',
  'XRP/USDT': 'ripple',
  'DOGE/USDT': 'dogecoin',
  'ATOM/USDT': 'cosmos',
  'UNI/USDT': 'uniswap',
  'AAVE/USDT': 'aave',
  'ARB/USDT': 'arbitrum',
};

const TIMEFRAME_TO_DAYS: Record<string, number> = {
  '1h': 1,
  '4h': 7,
  '1d': 30,
  '1w': 180,
  '1M': 365,
};

const querySchema = z.object({
  pair: z.string().min(1).max(30),
  timeframe: z.string().default('1d'),
  limit: z.coerce.number().int().min(10).max(500).default(100),
});

function generateMockCandles(
  pair: string,
  count: number,
  timeframeMs: number
): Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> {
  const now = Date.now();
  const basePrice = pair.includes('BTC') ? 65000 : pair.includes('ETH') ? 3400 : pair.includes('SOL') ? 140 : 1;
  const candles = [];
  let price = basePrice;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * timeframeMs;
    const volatility = basePrice * 0.02;
    const change = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = basePrice * (500 + Math.random() * 2000);

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      pair: searchParams.get('pair'),
      timeframe: searchParams.get('timeframe') ?? '1d',
      limit: searchParams.get('limit') ?? '100',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Parametres invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { pair, timeframe, limit } = parsed.data;
    const coinId = PAIR_TO_COINGECKO[pair.toUpperCase()];
    const days = TIMEFRAME_TO_DAYS[timeframe] ?? 30;

    // Try CoinGecko OHLC
    if (coinId) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(
          `${COINGECKO_BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`,
          {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
            next: { revalidate: CACHE_MAX_AGE },
          }
        );

        clearTimeout(timeout);

        if (response.ok) {
          const raw: number[][] = await response.json();
          const candles = raw.slice(-limit).map((entry) => ({
            timestamp: entry[0] ?? 0,
            open: entry[1] ?? 0,
            high: entry[2] ?? 0,
            low: entry[3] ?? 0,
            close: entry[4] ?? 0,
            volume: 0, // CoinGecko OHLC does not include volume
          }));

          return NextResponse.json(
            { candles, source: 'coingecko', pair, timeframe },
            {
              headers: {
                'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
              },
            }
          );
        }
      } catch (fetchError) {
        clearTimeout(timeout);
        // Fall through to mock data on fetch failure
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          // Timeout — use mock
        }
      }
    }

    // Fallback: generate mock candle data
    const timeframeMs: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };

    const candles = generateMockCandles(pair, limit, timeframeMs[timeframe] ?? 24 * 60 * 60 * 1000);

    return NextResponse.json(
      { candles, source: 'mock', pair, timeframe },
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
