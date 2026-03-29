import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const bodySchema = z.object({
  botId: z.string().uuid(),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { botId } = parsed.data;

    // Verify bot belongs to user
    const { data: existingBot, error: fetchError } = await supabase
      .from('bots')
      .select('id, user_id, status')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingBot) {
      return NextResponse.json({ error: 'Bot introuvable' }, { status: 404 });
    }

    // Prevent deleting active bot
    if (existingBot.status === 'active') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un bot actif. Mettez-le en pause d\'abord.' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('bots')
      .delete()
      .eq('id', botId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Erreur suppression bot', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
