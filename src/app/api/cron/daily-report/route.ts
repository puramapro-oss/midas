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

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .gt('login_count', 0);

    if (profilesError) {
      return NextResponse.json({ error: 'Erreur récupération profils', details: profilesError.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processed = 0;

    for (const profile of profiles) {
      const { data: trades } = await supabase
        .from('trades')
        .select('pnl, status, side, pair')
        .eq('user_id', profile.id)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      const closedTrades = trades?.filter((t) => t.status === 'closed') ?? [];
      const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
      const winningTrades = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
      const losingTrades = closedTrades.filter((t) => (t.pnl ?? 0) < 0).length;
      const winRate = closedTrades.length > 0
        ? Math.round((winningTrades / closedTrades.length) * 100)
        : 0;

      if ((trades?.length ?? 0) === 0) continue;

      const { error: insertError } = await supabase
        .from('daily_performance')
        .upsert(
          {
            user_id: profile.id,
            date: todayStart.toISOString().split('T')[0],
            total_trades: trades?.length ?? 0,
            closed_trades: closedTrades.length,
            winning_trades: winningTrades,
            losing_trades: losingTrades,
            total_pnl: Math.round(totalPnl * 100) / 100,
            win_rate: winRate,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' }
        );

      if (!insertError) processed++;
    }

    return NextResponse.json({
      success: true,
      processed,
      date: todayStart.toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
