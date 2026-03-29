import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const bodySchema = z.object({
  tradeId: z.string().uuid(),
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

    const { tradeId } = parsed.data;

    // Fetch trade and verify ownership
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .single();

    if (tradeError || !trade) {
      return NextResponse.json({ error: 'Trade introuvable' }, { status: 404 });
    }

    if (trade.status !== 'open') {
      return NextResponse.json({ error: 'Ce trade est deja ferme', status: trade.status }, { status: 400 });
    }

    // Use entry_price as exit_price base (in real scenario, fetch current market price)
    const entryPrice = trade.entry_price ?? 0;
    const exitPrice = entryPrice > 0 ? entryPrice * (1 + (Math.random() * 0.1 - 0.05)) : 0;

    // Calculate P&L
    let pnl = 0;
    if (entryPrice > 0 && exitPrice > 0) {
      const priceDiff = trade.side === 'buy'
        ? exitPrice - entryPrice
        : entryPrice - exitPrice;
      pnl = priceDiff * (trade.amount ?? 0);
    }

    const fee = (trade.amount ?? 0) * exitPrice * 0.001; // 0.1% fee estimate

    // Update trade
    const { data: updatedTrade, error: updateError } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        exit_price: parseFloat(exitPrice.toFixed(8)),
        pnl: parseFloat(pnl.toFixed(2)),
        fee: parseFloat(fee.toFixed(2)),
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError || !updatedTrade) {
      return NextResponse.json({ error: 'Erreur fermeture trade', details: updateError?.message }, { status: 500 });
    }

    return NextResponse.json({ trade: updatedTrade });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
