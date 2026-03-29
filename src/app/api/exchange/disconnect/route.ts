import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const bodySchema = z.object({
  connectionId: z.string().uuid(),
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

export async function POST(request: Request) {
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

    const { connectionId } = parsed.data;

    // Verify connection belongs to user before deleting
    const { data: connection, error: checkError } = await supabase
      .from('exchange_connections')
      .select('id, exchange')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !connection) {
      return NextResponse.json({ error: 'Connexion exchange introuvable' }, { status: 404 });
    }

    // Check for open trades on this connection
    const { count: openTrades } = await supabase
      .from('trades')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('exchange_connection_id', connectionId)
      .eq('status', 'open');

    if ((openTrades ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Impossible de deconnecter: des trades sont encore ouverts sur cet exchange', open_trades: openTrades },
        { status: 400 }
      );
    }

    // Delete the connection
    const { error: deleteError } = await supabase
      .from('exchange_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Erreur suppression connexion', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, exchange: connection.exchange });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
