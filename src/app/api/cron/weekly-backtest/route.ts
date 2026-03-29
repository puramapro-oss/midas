import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const now = new Date().toISOString();

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const { data: recentSignals } = await supabase
      .from('signals')
      .select('pair, direction, strength, composite_score, entry_price, stop_loss, take_profit, created_at')
      .gte('created_at', weekStart.toISOString())
      .eq('is_active', false)
      .order('created_at', { ascending: false })
      .limit(100);

    const signalCount = recentSignals?.length ?? 0;
    const pairs = [...new Set(recentSignals?.map((s) => s.pair) ?? [])];

    const { error } = await supabase.from('market_cache').upsert(
      {
        key: 'weekly_backtest',
        type: 'backtest_report',
        data: {
          status: 'completed',
          period_start: weekStart.toISOString(),
          period_end: now,
          signals_analyzed: signalCount,
          pairs_covered: pairs,
          completed_at: now,
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
      },
      { onConflict: 'key' }
    );

    if (error) {
      return NextResponse.json({ error: 'Erreur stockage backtest', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: 'completed',
      signals_analyzed: signalCount,
      pairs: pairs,
      timestamp: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
