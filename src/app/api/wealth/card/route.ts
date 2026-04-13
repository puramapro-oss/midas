import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { calculateCashback, getTransactionAction } from '@/lib/wealth/purity-engine';
import { PURITY_TIERS } from '@/lib/wealth/types';

const txSchema = z.object({
  amount: z.number().positive(),
  mcc: z.string().length(4),
  merchant_name: z.string().optional(),
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

// GET — card info + cashback history
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const supabase = getServiceClient();

    const { data: card } = await supabase
      .from('purama_cards')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: recentTx } = await supabase
      .from('card_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      card: card ?? {
        active: false,
        nature_score: 50,
        total_cashback: 0,
        monthly_cashback: 0,
      },
      transactions: recentTx ?? [],
      tiers: PURITY_TIERS,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — process a card transaction (simulate Treezor webhook)
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = txSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 });
    }

    const { amount, mcc, merchant_name } = parsed.data;
    const supabase = getServiceClient();

    // Check transaction action
    const action = getTransactionAction(mcc);

    // Fetch nature score
    const { data: card } = await supabase
      .from('purama_cards')
      .select('nature_score')
      .eq('user_id', user.id)
      .single();

    const natureScore = card?.nature_score ?? 50;

    // Calculate cashback
    const result = calculateCashback(amount, mcc, natureScore as number);

    // Record transaction
    await supabase.from('card_transactions').insert({
      user_id: user.id,
      amount,
      mcc,
      merchant_name: merchant_name ?? null,
      purity_level: result.level,
      cashback_amount: result.cashback,
      cashback_pct: result.level === 'sombre' || result.level === 'noir' ? 0 : result.cashback > 0 ? Math.round(result.cashback / amount * 100) : 0,
      action,
    });

    // Credit cashback to principal wallet if > 0
    if (result.cashback > 0) {
      const { data: wallet } = await supabase
        .from('smart_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .eq('wallet_type', 'principal')
        .single();

      const currentBalance = Number(wallet?.balance) || 0;

      await supabase.from('smart_wallets').upsert(
        {
          user_id: user.id,
          wallet_type: 'principal',
          balance: Math.round((currentBalance + result.cashback) * 100) / 100,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,wallet_type' }
      );

      // Update card total cashback
      await supabase.from('purama_cards').upsert(
        {
          user_id: user.id,
          total_cashback: (card as Record<string, unknown>)?.total_cashback
            ? Number((card as Record<string, unknown>).total_cashback) + result.cashback
            : result.cashback,
          monthly_cashback: result.cashback,
          nature_score: natureScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }

    return NextResponse.json({
      cashback: result.cashback,
      level: result.level,
      bonus_pct: result.bonus_pct,
      action,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
