import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordCancelWithFeedback } from '@/lib/retention';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body: { reason?: string } = await req.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'non précisé';

    await recordCancelWithFeedback(user.id, reason);

    return NextResponse.json({
      ok: true,
      message: 'Résiliation enregistrée. Accès conservé jusqu\'à la fin de la période en cours.',
    });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la résiliation. Réessaie ou contacte le support.' }, { status: 500 });
  }
}
