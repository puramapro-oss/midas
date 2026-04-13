import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { encrypt } from '@/lib/crypto/encrypt';

const bodySchema = z.object({
  apiKey: z.string().min(10, 'Clé API trop courte'),
  apiSecret: z.string().min(10, 'Secret API trop court'),
  exchange: z.string().default('binance'),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { apiKey, apiSecret, exchange } = parsed.data;

    // Encrypt keys with AES-256-GCM
    const encryptedKey = encrypt(apiKey);
    const encryptedSecret = encrypt(apiSecret);

    // Use service role client with midas schema
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'midas' } }
    );

    // Upsert into exchange_keys (delete old + insert new)
    await serviceClient
      .from('exchange_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('exchange', exchange);

    const { error } = await serviceClient
      .from('exchange_keys')
      .insert({
        user_id: user.id,
        exchange,
        api_key_encrypted: encryptedKey,
        api_secret_encrypted: encryptedSecret,
        permissions: ['read', 'trade'],
        is_valid: true,
        last_verified_at: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
