import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPrice } from '@/lib/data/coingecko';

const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'public' } }
    );

    const { data: openTrades, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'open');

    if (fetchError) {
      return NextResponse.json({ error: 'Erreur récupération trades', details: fetchError.message }, { status: 500 });
    }

    if (!openTrades || openTrades.length === 0) {
      return NextResponse.json({ success: true, checked: 0, closed: 0 });
    }

    const symbols = [...new Set(openTrades.map((t) => {
      const base = t.pair?.split('/')[0] ?? '';
      return base;
    }))];

    const coinIds = symbols
      .map((s) => SYMBOL_TO_COINGECKO[s])
      .filter(Boolean);

    const prices = coinIds.length > 0
      ? await getPrice(coinIds, { include24hChange: false })
      : {};

    let closed = 0;

    for (const trade of openTrades) {
      const base = trade.pair?.split('/')[0] ?? '';
      const coinId = SYMBOL_TO_COINGECKO[base];
      if (!coinId || !prices[coinId]) continue;

      const currentPrice = prices[coinId].usd;
      const stopLoss = trade.stop_loss as number | null;
      const takeProfit = trade.take_profit as number | null;
      const side = trade.side as string;

      let shouldClose = false;
      let closeReason = '';

      if (side === 'buy') {
        if (stopLoss && currentPrice <= stopLoss) {
          shouldClose = true;
          closeReason = 'stop_loss_hit';
        } else if (takeProfit && currentPrice >= takeProfit) {
          shouldClose = true;
          closeReason = 'take_profit_hit';
        }
      } else if (side === 'sell') {
        if (stopLoss && currentPrice >= stopLoss) {
          shouldClose = true;
          closeReason = 'stop_loss_hit';
        } else if (takeProfit && currentPrice <= takeProfit) {
          shouldClose = true;
          closeReason = 'take_profit_hit';
        }
      }

      if (shouldClose) {
        const entryPrice = trade.entry_price as number;
        const quantity = trade.quantity as number;
        const pnl = side === 'buy'
          ? (currentPrice - entryPrice) * quantity
          : (entryPrice - currentPrice) * quantity;

        const { error: updateError } = await supabase
          .from('trades')
          .update({
            status: 'closed',
            exit_price: currentPrice,
            pnl,
            close_reason: closeReason,
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', trade.id);

        if (!updateError) closed++;
      }
    }

    return NextResponse.json({
      success: true,
      checked: openTrades.length,
      closed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
