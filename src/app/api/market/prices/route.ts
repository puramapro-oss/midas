import { NextResponse } from 'next/server';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const COIN_IDS = 'bitcoin,ethereum,solana,cardano,polkadot,chainlink,avalanche-2,polygon';
const CACHE_MAX_AGE = 60; // 60 seconds

export async function GET() {
  try {
    const params = new URLSearchParams({
      ids: COIN_IDS,
      vs_currencies: 'usd',
      include_24hr_change: 'true',
      include_24hr_vol: 'true',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${COINGECKO_URL}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        next: { revalidate: CACHE_MAX_AGE },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => 'unknown');
        return NextResponse.json(
          { error: `CoinGecko API erreur: ${response.status}`, details: body.slice(0, 200) },
          { status: 502 }
        );
      }

      const prices = await response.json();

      return NextResponse.json(
        { prices },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
          },
        }
      );
    } catch (fetchError) {
      clearTimeout(timeout);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({ error: 'Timeout CoinGecko API' }, { status: 504 });
      }
      throw fetchError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
