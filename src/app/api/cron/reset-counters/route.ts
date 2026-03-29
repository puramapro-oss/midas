import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
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
      { db: { schema: 'midas' as string } }
    );

    const now = new Date();
    const nextReset = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // Reset daily_questions_used and daily_trades_used for all profiles
    const { data, error } = await adminSupabase
      .from('profiles')
      .update({
        daily_questions_used: 0,
        daily_trades_used: 0,
        daily_questions_reset_at: nextReset,
        daily_trades_reset_at: nextReset,
      })
      .lt('daily_questions_reset_at', now.toISOString())
      .select('id');

    if (error) {
      // Fallback: reset ALL profiles if the filter fails (e.g., null reset_at)
      const { data: allData, error: allError } = await adminSupabase
        .from('profiles')
        .update({
          daily_questions_used: 0,
          daily_trades_used: 0,
          daily_questions_reset_at: nextReset,
          daily_trades_reset_at: nextReset,
        })
        .gte('daily_questions_used', 0)
        .select('id');

      if (allError) {
        return NextResponse.json(
          { error: 'Erreur reset compteurs', details: allError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        updated: allData?.length ?? 0,
        mode: 'full_reset',
        timestamp: now.toISOString(),
      });
    }

    return NextResponse.json({
      updated: data?.length ?? 0,
      mode: 'selective_reset',
      timestamp: now.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
