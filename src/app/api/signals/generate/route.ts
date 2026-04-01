import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] as const;

function generateMockSignal(pair: string) {
  const directions = ['buy', 'sell', 'hold'] as const;
  const strengths = ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] as const;

  const compositeScore = Math.round(Math.random() * 100);
  const confidence = Math.round(40 + Math.random() * 60);

  let direction: (typeof directions)[number];
  let strength: (typeof strengths)[number];

  if (compositeScore > 70) {
    direction = 'buy';
    strength = compositeScore > 85 ? 'strong_buy' : 'buy';
  } else if (compositeScore < 30) {
    direction = 'sell';
    strength = compositeScore < 15 ? 'strong_sell' : 'sell';
  } else {
    direction = 'hold';
    strength = 'neutral';
  }

  const basePrice = pair === 'BTC/USDT' ? 95000 : pair === 'ETH/USDT' ? 3500 : 180;
  const variance = basePrice * 0.02;
  const entryPrice = basePrice + (Math.random() - 0.5) * variance;

  return {
    pair,
    direction,
    strength,
    composite_score: compositeScore,
    confidence,
    entry_price: Math.round(entryPrice * 100) / 100,
    stop_loss: Math.round(entryPrice * (direction === 'buy' ? 0.97 : 1.03) * 100) / 100,
    take_profit: Math.round(entryPrice * (direction === 'buy' ? 1.05 : 0.95) * 100) / 100,
    risk_reward_ratio: Math.round((1 + Math.random() * 2) * 100) / 100,
    confluences_count: Math.floor(2 + Math.random() * 5),
    reasoning: `Signal genere automatiquement pour ${pair}. Score composite: ${compositeScore}/100.`,
    agents_data: {
      technical: { signal: strength, confidence: Math.round(Math.random() * 100) },
      sentiment: { signal: strength, confidence: Math.round(Math.random() * 100) },
      onchain: { signal: strength, confidence: Math.round(Math.random() * 100) },
    },
    is_active: true,
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'public' } }
    );

    // Deactivate old signals
    await adminSupabase
      .from('signals')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString());

    // Generate new signals for each pair
    const signals = PAIRS.map((pair) => generateMockSignal(pair));

    const { data, error } = await adminSupabase
      .from('signals')
      .insert(signals)
      .select('id');

    if (error) {
      return NextResponse.json({ error: 'Erreur insertion signaux', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: data?.length ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
