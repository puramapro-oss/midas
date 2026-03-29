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

    const { data: connections, error: fetchError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, user_id')
      .eq('is_active', true);

    if (fetchError) {
      return NextResponse.json({ error: 'Erreur récupération connexions', details: fetchError.message }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    let synced = 0;
    const now = new Date().toISOString();

    for (const connection of connections) {
      const { error: updateError } = await supabase
        .from('exchange_connections')
        .update({
          last_balance_sync: now,
          updated_at: now,
        })
        .eq('id', connection.id);

      if (!updateError) synced++;
    }

    return NextResponse.json({
      success: true,
      synced,
      total: connections.length,
      timestamp: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
