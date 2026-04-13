// =============================================================================
// MIDAS — Cron Events Sync
// Brief : sync CoinMarketCal 1x/jour. Cache les events dans midas.market_cache
// pour réduire les appels API et alimenter le calendar agent.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUpcomingEvents, assessEventImpact } from '@/lib/data/coinmarketcal';
import { trackApiCall } from '@/lib/data/api-manager';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'midas' } },
    );

    // Top coins à suivre
    const coins = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'MATIC', 'LINK', 'DOT'];

    const events = await getUpcomingEvents(coins);
    await trackApiCall('coinmarketcal');

    const enriched = events.map((e) => ({
      ...e,
      impact_data: assessEventImpact(e),
    }));

    // Stocker dans market_cache (table existante)
    await supabase.from('market_cache').upsert(
      {
        key: 'events_calendar',
        type: 'calendar_events',
        data: {
          synced_at: new Date().toISOString(),
          coins,
          events: enriched.slice(0, 100),
          total: events.length,
        },
        expires_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'key' },
    );

    return NextResponse.json({
      ok: true,
      synced: enriched.length,
      coins,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
