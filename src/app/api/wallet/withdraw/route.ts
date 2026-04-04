import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const withdrawSchema = z.object({
  amount: z.number().min(5, 'Minimum 5€'),
  iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, 'IBAN invalide'),
});

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'midas' },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component — safe to ignore */ }
        },
      },
    }
  );
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const clean = { ...body, iban: typeof body.iban === 'string' ? body.iban.replace(/\s/g, '').toUpperCase() : '' };
    const parsed = withdrawSchema.safeParse(clean);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { amount, iban } = parsed.data;
    const service = getServiceClient();

    // Check wallet balance
    const { data: wallet } = await service
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 });
    }

    // Check no pending withdrawal
    const { data: pending } = await service
      .from('withdrawal_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1);

    if (pending && pending.length > 0) {
      return NextResponse.json({ error: 'Un retrait est déjà en cours' }, { status: 400 });
    }

    // Debit wallet
    await service
      .from('wallets')
      .update({ balance: wallet.balance - amount })
      .eq('user_id', user.id);

    // Record transaction
    await service.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'debit',
      amount,
      source: 'withdrawal',
      description: `Retrait vers ${iban.slice(0, 4)}****${iban.slice(-4)}`,
    });

    // Create withdrawal request
    const { data: withdrawal, error } = await service
      .from('withdrawal_requests')
      .insert({ user_id: user.id, amount, iban })
      .select()
      .single();

    if (error) {
      // Rollback wallet
      await service
        .from('wallets')
        .update({ balance: wallet.balance })
        .eq('user_id', user.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, withdrawal });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
