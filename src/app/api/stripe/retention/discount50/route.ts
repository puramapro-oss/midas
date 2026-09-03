import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyDiscount50, logRetentionEvent } from '@/lib/retention';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const result = await applyDiscount50(user.id);
    await logRetentionEvent(user.id, 'discount50', result.applied ? 'accepted' : 'declined');

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'application de l'offre. Réessaie ou contacte le support." }, { status: 500 });
  }
}
