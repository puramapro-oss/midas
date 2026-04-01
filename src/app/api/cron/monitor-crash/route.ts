import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const CRASH_THRESHOLD_PERCENT = -5;

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let btcChange1h = 0;

    try {
      const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=bitcoin&price_change_percentage=1h`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.[0]?.price_change_percentage_1h_in_currency != null) {
          btcChange1h = data[0].price_change_percentage_1h_in_currency;
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    const isCrash = btcChange1h <= CRASH_THRESHOLD_PERCENT;

    if (isCrash) {
      const { data: affected } = await supabase
        .from('profiles')
        .update({
          auto_trade_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('auto_trade_enabled', true)
        .select('id');

      await supabase.from('market_cache').upsert(
        {
          key: 'crash_alert',
          type: 'crash_alert',
          data: {
            btc_change_1h: btcChange1h,
            detected_at: new Date().toISOString(),
            auto_trade_paused_count: affected?.length ?? 0,
          },
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      return NextResponse.json({
        success: true,
        status: 'crash_detected',
        btcChange1h,
        autoTradePaused: affected?.length ?? 0,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      status: 'stable',
      btcChange1h,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
