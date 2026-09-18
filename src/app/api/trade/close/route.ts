import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { fetchTicker24h } from '@/lib/data/binance';
import { pairToSymbol } from '@/lib/exchange/binance-public';
import { createServiceClient } from '@/lib/supabase/server';
import { PAPER_FEE_RATE } from '@/lib/trading/paper-trading-engine';

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
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { tradeId } = parsed.data;
    const supabase = createServiceClient();

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

    const entryPrice = Number(trade.entry_price ?? 0);
    const quantity = Number(trade.quantity ?? 0);
    if (entryPrice <= 0 || quantity <= 0) {
      return NextResponse.json({ error: 'Position invalide: prix ou quantite manquant' }, { status: 409 });
    }

    // Décision Tissma D2=A (2026-09-05), contrat check-niyama-decisions.mjs :
    // fermeture en simulation uniquement. Un trade marqué non-paper (données
    // historiques antérieures) ne peut PAS déclencher d'ordre exchange —
    // aucun chemin ccxt n'existe ici.
    if (!trade.is_paper_trade) {
      return NextResponse.json(
        { error: 'Les positions réelles ne peuvent plus être fermées via MIDAS (éducation uniquement). Contacte ton exchange directement.' },
        { status: 403 },
      );
    }

    const ticker = await fetchTicker24h(pairToSymbol(trade.pair));
    if (!ticker || ticker.lastPrice <= 0) {
      return NextResponse.json({ error: 'Prix de marche indisponible; position non modifiee' }, { status: 503 });
    }
    const exitPrice = ticker.lastPrice;
    const exitQuantity = quantity;
    const exitFees = quantity * exitPrice * PAPER_FEE_RATE;

    // Calculate P&L
    let pnl = 0;
    if (entryPrice > 0 && exitPrice > 0) {
      const priceDiff = trade.side === 'buy'
        ? exitPrice - entryPrice
        : entryPrice - exitPrice;
      pnl = priceDiff * exitQuantity;
    }
    const totalFees = Number(trade.fees ?? 0) + exitFees;

    // Update trade
    const { data: updatedTrade, error: updateError } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        exit_price: parseFloat(exitPrice.toFixed(8)),
        pnl: parseFloat(pnl.toFixed(2)),
        fees: parseFloat(totalFees.toFixed(8)),
        pnl_pct: entryPrice * exitQuantity > 0 ? (pnl / (entryPrice * exitQuantity)) * 100 : 0,
        close_reason: 'manual',
        exchange_response: trade.exchange_response,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .eq('status', 'open')
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
