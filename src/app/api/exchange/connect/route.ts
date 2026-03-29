import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { encrypt } from '@/lib/exchange/encryption';
import { PLAN_LIMITS } from '@/lib/utils/constants';
import type { MidasPlan } from '@/types/stripe';

const bodySchema = z.object({
  exchange: z.enum(['binance', 'bybit', 'okx', 'bitget', 'kucoin', 'gate', 'mexc', 'htx', 'coinbase', 'kraken']),
  apiKey: z.string().min(10).max(500),
  apiSecret: z.string().min(10).max(500),
  label: z.string().min(1).max(50).optional(),
  isTestnet: z.boolean().default(false),
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

    const { exchange, apiKey, apiSecret, label, isTestnet } = parsed.data;

    // Fetch profile to check exchange limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, plan, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    // Check max exchanges (super_admin bypass)
    if (profile.role !== 'super_admin') {
      const plan = (profile.plan as MidasPlan) ?? 'free';
      const maxExchanges = PLAN_LIMITS[plan]?.limits.max_exchanges ?? 1;

      const { count: currentCount } = await supabase
        .from('exchange_connections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if ((currentCount ?? 0) >= maxExchanges) {
        return NextResponse.json(
          { error: 'Nombre maximum d\'exchanges atteint', max: maxExchanges },
          { status: 429 }
        );
      }
    }

    // Encrypt API keys
    const encryptedKey = encrypt(apiKey);
    const encryptedSecret = encrypt(apiSecret);

    // Upsert exchange connection
    const { data: connection, error: connError } = await supabase
      .from('exchange_connections')
      .upsert(
        {
          user_id: user.id,
          exchange,
          label: label ?? `${exchange} ${isTestnet ? '(testnet)' : ''}`.trim(),
          api_key_encrypted: encryptedKey.encrypted,
          api_key_iv: encryptedKey.iv,
          api_secret_encrypted: encryptedSecret.encrypted,
          api_secret_iv: encryptedSecret.iv,
          is_testnet: isTestnet,
          is_active: true,
          permissions: ['read', 'spot_trade'],
          error_message: null,
          last_sync_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,exchange',
        }
      )
      .select('id, exchange, label, is_testnet, is_active, permissions')
      .single();

    if (connError) {
      // If upsert with onConflict fails, try insert directly
      const { data: insertedConn, error: insertError } = await supabase
        .from('exchange_connections')
        .insert({
          user_id: user.id,
          exchange,
          label: label ?? `${exchange} ${isTestnet ? '(testnet)' : ''}`.trim(),
          api_key_encrypted: encryptedKey.encrypted,
          api_key_iv: encryptedKey.iv,
          api_secret_encrypted: encryptedSecret.encrypted,
          api_secret_iv: encryptedSecret.iv,
          is_testnet: isTestnet,
          is_active: true,
          permissions: ['read', 'spot_trade'],
        })
        .select('id, exchange, label, is_testnet, is_active, permissions')
        .single();

      if (insertError) {
        return NextResponse.json({ error: 'Erreur connexion exchange', details: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, connection: insertedConn }, { status: 201 });
    }

    return NextResponse.json({ success: true, connection });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
