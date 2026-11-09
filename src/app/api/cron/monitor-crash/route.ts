import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertCronAuth } from '@/lib/cron-auth';
import { parseCrashObservation } from '@/lib/trading/crash-observation';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'public' } }
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let observation;

    try {
      const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=bitcoin&price_change_percentage=1h`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Fournisseur BTC indisponible');
      observation = parseCrashObservation(await response.json());
    } finally {
      clearTimeout(timeout);
    }

    const { change1h: btcChange1h, isCrash } = observation;

    if (isCrash) {
      const { data: affected, error: pauseError } = await supabase
        .from('profiles')
        .update({
          auto_trade_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('auto_trade_enabled', true)
        .select('id');
      if (pauseError || !affected) throw new Error('Mise en pause non confirmée');

      const { error: cacheError } = await supabase.from('market_cache').upsert(
        {
          key: 'crash_alert',
          type: 'crash_alert',
          data: {
            btc_change_1h: btcChange1h,
            detected_at: new Date().toISOString(),
            observed_at: new Date(observation.observedAt).toISOString(),
            source: observation.source,
            auto_trade_paused_count: affected?.length ?? 0,
          },
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
      if (cacheError) throw new Error('Alerte non enregistrée ; vérifier la mise en pause');

      return NextResponse.json({
        success: true,
        status: 'crash_detected',
        btcChange1h,
        autoTradePaused: affected?.length ?? 0,
        observedAt: new Date(observation.observedAt).toISOString(),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      status: 'stable',
      btcChange1h,
      observedAt: new Date(observation.observedAt).toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message, status: 'unconfirmed' }, { status: 503 });
  }
}
