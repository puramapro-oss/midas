import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { decrypt } from '@/lib/exchange/encryption';
import { createExchangeClient, isSupportedExchange } from '@/lib/exchange/ccxt-client';

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

    // Fetch connection with encrypted keys
    const { data: connection, error: connError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, label, is_active, is_testnet, api_key_encrypted, api_key_iv, api_secret_encrypted, api_secret_iv, last_sync_at')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'Connexion exchange introuvable' }, { status: 404 });
    }

    if (!connection.is_active) {
      return NextResponse.json({ error: 'Connexion exchange inactive' }, { status: 400 });
    }

    // Decrypt keys and fetch real balance via ccxt
    const exchangeName = connection.exchange as string;
    if (!isSupportedExchange(exchangeName)) {
      return NextResponse.json({ error: `Exchange non supporte: ${exchangeName}` }, { status: 400 });
    }

    const apiKey = decrypt(connection.api_key_encrypted as string, connection.api_key_iv as string);
    const apiSecret = decrypt(connection.api_secret_encrypted as string, connection.api_secret_iv as string);

    const client = createExchangeClient(exchangeName, {
      apiKey,
      secret: apiSecret,
      testnet: connection.is_testnet as boolean,
    });

    const balance = await client.fetchBalance();

    // Build clean balance response
    const balances: Record<string, { free: number; used: number; total: number }> = {};
    let totalUsd = 0;

    const totalObj = (balance.total ?? {}) as unknown as Record<string, number>;
    const freeObj = (balance.free ?? {}) as unknown as Record<string, number>;
    const usedObj = (balance.used ?? {}) as unknown as Record<string, number>;

    for (const [asset, total] of Object.entries(totalObj)) {
      const t = total;
      if (t > 0) {
        const free = freeObj[asset] ?? 0;
        const used = usedObj[asset] ?? 0;
        balances[asset] = { free, used, total: t };

        // Estimate USD value for stablecoins
        if (['USDT', 'USDC', 'BUSD', 'DAI', 'FDUSD'].includes(asset)) {
          totalUsd += t;
        }
      }
    }

    // Update last_sync_at
    await supabase
      .from('exchange_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    return NextResponse.json({
      balance: {
        total: balances,
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
