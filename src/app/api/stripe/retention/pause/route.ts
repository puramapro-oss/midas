import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pauseSubscription, logRetentionEvent } from '@/lib/retention';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body: { months?: number } = await req.json().catch(() => ({}));
    const months = body.months === 2 || body.months === 3 ? body.months : 1;

    await pauseSubscription(user.id, months);
    await logRetentionEvent(user.id, 'pause', 'accepted', { months });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la mise en pause. Réessaie ou contacte le support.' }, { status: 500 });
  }
}
