import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentIndex, fearGreedToSignal } from '@/lib/data/fear-greed';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'midas' as string } }
    );

    const fgIndex = await getCurrentIndex();
    const tradingSignal = fearGreedToSignal(fgIndex.value);

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('market_cache').upsert(
      {
        key: 'fear_greed_index',
        type: 'fear_greed',
        data: {
          value: fgIndex.value,
          classification: fgIndex.value_classification,
          trading_signal: tradingSignal.signal,
          signal_strength: tradingSignal.strength,
          interpretation: tradingSignal.interpretation,
          fetched_at: now,
        },
        expires_at: expiresAt,
        updated_at: now,
      },
      { onConflict: 'key' }
    );

    if (error) {
      return NextResponse.json({ error: 'Erreur stockage Fear & Greed', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      index: fgIndex.value,
      label: fgIndex.value_classification,
      signal: tradingSignal.signal,
      timestamp: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
