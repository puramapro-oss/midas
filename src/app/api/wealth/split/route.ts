import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { computeSplit } from '@/lib/wealth/smart-split';
import { WALLET_SPLITS, type WalletType } from '@/lib/wealth/types';

const bodySchema = z.object({
  amount: z.number().positive(),
  source: z.string().min(1),
  description: z.string().optional(),
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

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } }
  );
}

// POST — split an incoming amount across sub-wallets
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 });
    }

    const { amount, source, description } = parsed.data;
    const supabase = getServiceClient();

    // Fetch current balances
    const { data: currentWallets } = await supabase
      .from('smart_wallets')
      .select('wallet_type, balance')
      .eq('user_id', user.id);

    const currentBalances: Record<WalletType, number> = {
      principal: 0, boost: 0, emergency: 0, dream: 0, pending: 0, solidaire: 0,
    };
    (currentWallets ?? []).forEach((w) => {
      currentBalances[w.wallet_type as WalletType] = Number(w.balance) || 0;
    });

    // Compute split
    const allocations = computeSplit(amount, currentBalances);

    // Upsert each sub-wallet
    for (const [type, alloc] of Object.entries(allocations)) {
      if (alloc <= 0) continue;

      const existing = currentBalances[type as WalletType];
      const newBalance = Math.round((existing + alloc) * 100) / 100;

      await supabase.from('smart_wallets').upsert(
        {
          user_id: user.id,
          wallet_type: type,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,wallet_type' }
      );

      // Record transaction
      await supabase.from('wealth_transactions').insert({
        user_id: user.id,
        wallet_type: type,
        type: 'credit',
        amount: alloc,
        source,
        description: description ?? `Smart Split: ${WALLET_SPLITS[type as WalletType]?.label}`,
      });
    }

    // Also record in wealth_earnings
    await supabase.from('wealth_earnings').insert({
      user_id: user.id,
      engine_id: source,
      amount,
      description: description ?? `Revenu ${source}`,
    });

    return NextResponse.json({
      ok: true,
      total: amount,
      allocations,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
