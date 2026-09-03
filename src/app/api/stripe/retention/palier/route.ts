import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downgradeTier, logRetentionEvent } from '@/lib/retention';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    await downgradeTier(user.id);
    await logRetentionEvent(user.id, 'palier', 'accepted');

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
