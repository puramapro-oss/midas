import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const querySchema = z.object({
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

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      connectionId: searchParams.get('connectionId'),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'connectionId requis et valide (UUID)', details: parsed.error.flatten() }, { status: 400 });
    }

    const { connectionId } = parsed.data;

    // Verify connection belongs to user
    const { data: connection, error: connError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, label, is_active, is_testnet, last_sync_at')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'Connexion exchange introuvable' }, { status: 404 });
    }

    if (!connection.is_active) {
      return NextResponse.json({ error: 'Connexion exchange inactive' }, { status: 400 });
    }

    // Mock balance (actual exchange call requires API key decryption + CCXT)
    // In production, decrypt keys and call exchange API
    const mockBalances: Record<string, { free: number; used: number; total: number }> = {
      BTC: { free: 0.5234, used: 0.1, total: 0.6234 },
      ETH: { free: 3.892, used: 0, total: 3.892 },
      USDT: { free: 12500.45, used: 2500, total: 15000.45 },
      SOL: { free: 45.12, used: 0, total: 45.12 },
    };

    const totalUsd = 67842.50;

    // Update last_sync_at
    await supabase
      .from('exchange_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    return NextResponse.json({
      balance: {
        total: mockBalances,
        totalUsd,
        exchange: connection.exchange,
        label: connection.label,
        is_testnet: connection.is_testnet,
        synced_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
