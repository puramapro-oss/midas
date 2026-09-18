import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertCronAuth } from '@/lib/cron-auth';

export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'public' } }
    );

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('market_cache')
      .delete()
      .lt('expires_at', now)
      .select('id');

    if (error) {
      return NextResponse.json({ error: 'Erreur nettoyage cache', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length ?? 0,
      timestamp: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
