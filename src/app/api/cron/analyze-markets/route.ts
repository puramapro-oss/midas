import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPrice, getMarketData } from '@/lib/data/coingecko';

const TOP_PAIRS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana', symbol: 'SOL' },
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'public' } }
    );

    const coinIds = TOP_PAIRS.map((p) => p.id);

    const [prices, marketData] = await Promise.all([
      getPrice(coinIds, { include24hChange: true, includeVolume: true, includeMarketCap: true }),
      getMarketData(coinIds),
    ]);

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    let analyzed = 0;

    for (const pair of TOP_PAIRS) {
      const priceData = prices[pair.id];
      const market = marketData.find((m) => m.id === pair.id);

      if (!priceData) continue;

      const change24h = priceData.usd_24h_change ?? 0;
      let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (change24h > 3) signal = 'bullish';
      else if (change24h < -3) signal = 'bearish';

      const cacheEntry = {
        key: `market_analysis_${pair.symbol}`,
        type: 'market_analysis',
        data: {
          symbol: pair.symbol,
          coin_id: pair.id,
          price: priceData.usd,
          change_24h: change24h,
          volume_24h: priceData.usd_24h_vol ?? 0,
          market_cap: priceData.usd_market_cap ?? 0,
          high_24h: market?.high_24h ?? null,
          low_24h: market?.low_24h ?? null,
          ath: market?.ath ?? null,
          signal,
          analyzed_at: now,
        },
        expires_at: expiresAt,
        updated_at: now,
      };

      const { error } = await supabase
        .from('market_cache')
        .upsert(cacheEntry, { onConflict: 'key' });

      if (!error) analyzed++;
    }

    return NextResponse.json({ success: true, analyzed, timestamp: now });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
