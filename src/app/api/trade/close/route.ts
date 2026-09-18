import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { fetchTicker24h } from '@/lib/data/binance';
import { pairToSymbol } from '@/lib/exchange/binance-public';
import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/exchange/encryption';
import { createExchangeClient, isSupportedExchange } from '@/lib/exchange/ccxt-client';
import { confirmedExecution, normalizeQuantity } from '@/lib/trading/execution-safety';
import { randomUUID } from 'crypto';

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

    let exitPrice = entryPrice;
    let exitQuantity = quantity;
    let exitFees = 0;
    let exitOrderId: string | null = null;
    let executionIntentId: string | null = null;

    if (trade.is_paper_trade) {
      const ticker = await fetchTicker24h(pairToSymbol(trade.pair));
      if (!ticker || ticker.lastPrice <= 0) {
        return NextResponse.json({ error: 'Prix de marche indisponible; position non modifiee' }, { status: 503 });
      }
      exitPrice = ticker.lastPrice;
      exitFees = quantity * exitPrice * 0.001;
    } else {
      if (!trade.exchange_connection_id) {
        return NextResponse.json({ error: 'Connexion exchange absente; fermeture reelle bloquee' }, { status: 409 });
      }
      const { data: connection, error: connectionError } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('id', trade.exchange_connection_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (connectionError || !connection || !isSupportedExchange(connection.exchange)) {
        return NextResponse.json({ error: 'Connexion exchange introuvable ou non supportee' }, { status: 409 });
      }

      const intentKey = randomUUID();
      const closeSide = trade.side === 'buy' ? 'sell' : 'buy';
      const { data: intent, error: intentError } = await supabase.from('trade_execution_intents').insert({
        user_id: user.id,
        trade_id: trade.id,
        exchange_connection_id: connection.id,
        idempotency_key: intentKey,
        purpose: 'close',
        symbol: trade.pair,
        side: closeSide,
        requested_quantity: quantity,
        status: 'prepared',
      }).select('id').single();
      if (intentError || !intent) {
        return NextResponse.json({ error: 'Fermeture deja en cours ou registre indisponible; aucun ordre envoye' }, { status: 409 });
      }
      executionIntentId = intent.id;

      try {
        const client = createExchangeClient(connection.exchange, {
          apiKey: decrypt(connection.api_key_encrypted, connection.api_key_iv),
          secret: decrypt(connection.api_secret_encrypted, connection.api_secret_iv),
          testnet: connection.is_testnet,
        });
        await client.loadMarkets();
        const market = client.market(trade.pair);
        const ticker = await client.fetchTicker(trade.pair);
        const referencePrice = Number(ticker.last ?? ticker.bid ?? ticker.ask);
        const closeQuantity = normalizeQuantity(client, market, quantity, referencePrice);
        await supabase.from('trade_execution_intents').update({ status: 'submitted' }).eq('id', intent.id);
        let order = await client.createMarketOrder(trade.pair, closeSide, closeQuantity);
        if ((!order.filled || !order.average) && order.id && client.has.fetchOrder) {
          order = await client.fetchOrder(order.id, trade.pair);
        }
        const execution = confirmedExecution(order);
        exitPrice = execution.price;
        exitQuantity = execution.quantity;
        exitFees = execution.fees;
        exitOrderId = order.id ?? null;
        if (exitQuantity < quantity * 0.999999) {
          throw new Error(`Partial close confirmed (${exitQuantity}/${quantity}); reconciliation required`);
        }
        await supabase.from('trade_execution_intents').update({
          status: 'confirmed',
          exchange_order_id: exitOrderId,
          exchange_response: order,
          updated_at: new Date().toISOString(),
        }).eq('id', intent.id);
      } catch (error) {
        await supabase.from('trade_execution_intents').update({
          status: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown close execution error',
          updated_at: new Date().toISOString(),
        }).eq('id', intent.id);
        return NextResponse.json({ error: 'Resultat de fermeture incertain; verification courtier requise, aucun nouvel essai automatique' }, { status: 502 });
      }
    }

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
        exchange_response: exitOrderId ? { close_order_id: exitOrderId } : trade.exchange_response,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .eq('status', 'open')
      .select('*')
      .single();

    if (updateError || !updatedTrade) {
      if (executionIntentId) {
        await supabase.from('trade_execution_intents').update({
          status: 'unknown',
          error: `Close order confirmed but trade persistence failed: ${updateError?.message ?? 'unknown error'}`,
          updated_at: new Date().toISOString(),
        }).eq('id', executionIntentId);
      }
      return NextResponse.json({ error: 'Erreur fermeture trade', details: updateError?.message }, { status: 500 });
    }

    return NextResponse.json({ trade: updatedTrade });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
