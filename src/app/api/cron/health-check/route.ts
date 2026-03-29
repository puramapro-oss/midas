import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const COINGECKO_PING = 'https://api.coingecko.com/api/v3/ping';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const checks: Record<string, 'up' | 'down'> = {
      supabase: 'down',
      coingecko: 'down',
    };

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'midas' as string } }
    );

    const supabaseCheck = supabase.from('profiles').select('id').limit(1);
    const coingeckoCheck = fetch(COINGECKO_PING, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    const [supabaseResult, coingeckoResult] = await Promise.allSettled([
      supabaseCheck,
      coingeckoCheck,
    ]);

    if (supabaseResult.status === 'fulfilled' && !supabaseResult.value.error) {
      checks.supabase = 'up';
    }

    if (coingeckoResult.status === 'fulfilled' && coingeckoResult.value.ok) {
      checks.coingecko = 'up';
    }

    const allUp = Object.values(checks).every((v) => v === 'up');
    const status = allUp ? 'healthy' : 'degraded';

    return NextResponse.json({
      success: true,
      status,
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
