import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPhase } from '@/lib/phase';
import { generateVerifiedSignal } from '@/lib/signals/generate-verified-signal';

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] as const;

export async function GET(request: NextRequest) {
  if (!getPhase().personalizedCryptoAdvice) {
    return NextResponse.json(
      { error: 'La génération de signaux est désactivée : information et éducation uniquement.', policy: 'D2=A' },
      { status: 403 },
    );
  }
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
  }
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: 'public' } });
    await supabase.from('signals').update({ is_active: false }).lt('expires_at', new Date().toISOString());
    const results = await Promise.allSettled(PAIRS.map(generateVerifiedSignal));
    const signals = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    const failures = results.flatMap((result, index) => result.status === 'rejected'
      ? [{ pair: PAIRS[index], error: result.reason instanceof Error ? result.reason.message : 'Echec analyse' }]
      : []);
    if (signals.length === 0) return NextResponse.json({ error: 'Aucun signal verifie genere', failures }, { status: 503 });
    const { data, error } = await supabase.from('signals').insert(signals).select('id');
    if (error) return NextResponse.json({ error: 'Erreur insertion signaux', details: error.message }, { status: 500 });
    return NextResponse.json({ success: true, generated: data?.length ?? 0, failures, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne' }, { status: 500 });
  }
}
