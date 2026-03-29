import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { createExchangeClient, isSupportedExchange } from '@/lib/exchange/ccxt-client';

const bodySchema = z.object({
  exchange: z.string().min(1).max(30),
  apiKey: z.string().min(10).max(500),
  apiSecret: z.string().min(10).max(500),
  testnet: z.boolean().default(false),
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
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { exchange, apiKey, apiSecret, testnet } = parsed.data;

    if (!isSupportedExchange(exchange)) {
      return NextResponse.json(
        { connected: false, error: `Exchange non supporte: ${exchange}` },
        { status: 400 }
      );
    }

    try {
      const client = createExchangeClient(exchange, {
        apiKey,
        secret: apiSecret,
        testnet,
      });

      // Test the connection by fetching balance
      const balance = await client.fetchBalance();

      const totalUsd = Object.entries(balance.total ?? {})
        .filter(([, value]) => (value as number) > 0)
        .length;

      return NextResponse.json({
        connected: true,
        assetsCount: totalUsd,
        exchange,
      });
    } catch (exchangeError) {
      const errorMessage = exchangeError instanceof Error
        ? exchangeError.message
        : 'Erreur de connexion inconnue';

      return NextResponse.json({
        connected: false,
        error: errorMessage,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
