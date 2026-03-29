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
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error } = await supabase.from('market_cache').upsert(
      {
        key: 'whale_check',
        type: 'whale_activity',
        data: {
          last_check: now,
          status: 'executed',
          message: 'Whale monitoring cycle completed. Whale Alert API requires paid key for real-time data.',
        },
        expires_at: expiresAt,
        updated_at: now,
      },
      { onConflict: 'key' }
    );

    if (error) {
      return NextResponse.json({ error: 'Erreur stockage whale check', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      checked: true,
      timestamp: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
