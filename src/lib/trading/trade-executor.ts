// =============================================================================
// MIDAS — Trade Executor
// Execute educational paper trades with a full audit trail
// =============================================================================

import type { CoordinatorDecision } from '@/lib/agents/types';
import { createServiceClient } from '@/lib/supabase/server';
import { RiskManager, type UserProfile, type OpenPosition, type TradeHistory } from './risk-manager';
import { simulate } from './pre-trade-simulation';
import { executePaperTrade } from './paper-trading-engine';
import { decrypt } from '@/lib/exchange/encryption';
import { createExchangeClient, isSupportedExchange } from '@/lib/exchange/ccxt-client';
import { calculateSpotOrderSize, confirmedExecution, normalizeQuantity } from './execution-safety';
import { randomUUID } from 'crypto';
import { fetchKlines } from '@/lib/exchange/binance-public';

// Ligne brute de midas.exchange_connections (select('*') via service client).
// Le type app `ExchangeConnection` (src/types/exchange.ts) est la vue
// sanitized sans clés — inutilisable pour l'exécution d'ordres.
interface ExchangeConnectionRow {
  id: string;
  exchange: string;
  api_key_encrypted: string;
  api_key_iv: string;
  api_secret_encrypted: string;
  api_secret_iv: string;
  is_testnet: boolean;
  is_active: boolean;
}

export interface TradeResult {
  success: boolean;
  trade_id: string | null;
  order_id: string | null;
  executed_price: number;
  executed_quantity: number;
  fees: number;
  slippage_pct: number;
  is_paper: boolean;
  error: string | null;
  timestamp: number;
}

export async function executeTrade(
  decision: CoordinatorDecision,
  userId: string,
  exchangeConnectionId: string,
  options: { forcePaper?: boolean; quoteAmount?: number } = {},
): Promise<TradeResult> {
  const timestamp = Date.now();
  const supabase = createServiceClient();

  try {
    // 1. Fetch exchange connection
    const { data: connection, error: connError } = await supabase
      .from('exchange_connections')
      .select('*')
      .eq('id', exchangeConnectionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return failResult('Exchange connection not found or inactive', timestamp);
    }

    // 2. Fetch user profile for risk checks
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profileData) {
      return failResult('User profile not found', timestamp);
    }

    const { data: tradingSettings } = await supabase
      .from('trading_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const userProfile: UserProfile = {
      id: userId,
      plan: profileData.plan ?? 'free',
      daily_loss_limit_usd: tradingSettings?.daily_loss_limit_usd ?? 100,
      weekly_loss_limit_usd: tradingSettings?.weekly_loss_limit_usd ?? 500,
      monthly_loss_limit_usd: tradingSettings?.monthly_loss_limit_usd ?? 2000,
      max_position_size_pct: tradingSettings?.max_position_size_pct ?? 2,
      max_concurrent_positions: tradingSettings?.max_concurrent_positions ?? 5,
      capital_usd: tradingSettings?.capital_usd ?? 1000,
    };

    // 3. Fetch open positions
    const { data: positionsData } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open');

    const openPositions: OpenPosition[] = (positionsData ?? []).map((p) => ({
      id: p.id as string,
      symbol: (p.pair ?? p.symbol) as string,
      side: p.side as 'buy' | 'sell',
      entry_price: Number(p.entry_price),
      current_price: Number(p.current_price ?? p.entry_price),
      quantity: Number(p.quantity),
      unrealized_pnl: Number(p.unrealized_pnl ?? 0),
      leverage: Number(p.leverage ?? 1),
      allocation_pct: userProfile.capital_usd > 0
        ? (Number(p.quote_amount ?? 0) / userProfile.capital_usd) * 100
        : 0,
      opened_at: new Date(p.created_at as string).getTime(),
    }));

    // 4. Fetch recent trade history for circuit breaker
    const { data: historyData } = await supabase
      .from('trades')
      .select('pnl, closed_at')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .gte('closed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5000);

    const recentTrades: TradeHistory[] = (historyData ?? [])
      .filter((t) => t.closed_at)
      .map((t) => ({
        pnl: Number(t.pnl ?? 0),
        closed_at: new Date(t.closed_at as string).getTime(),
      }));

    // 5. Run MIDAS Shield risk checks
    const btcCandles = await fetchKlines('BTC/USDT', '1m', 61);
    if (btcCandles.length < 2) {
      return failResult('BTC crash-protection data unavailable; no live order was sent', timestamp);
    }
    const btcPriceHistory = btcCandles.map((candle) => ({ timestamp: candle.timestamp, price: candle.close }));
    const riskManager = new RiskManager(undefined, recentTrades, btcPriceHistory);
    const shieldResult = riskManager.checkAllLevels(decision, userProfile, openPositions);

    if (!shieldResult.passed) {
      await logAudit(supabase, userId, decision, 'blocked_by_shield', shieldResult.failures);
      return failResult(`Shield blocked: ${shieldResult.failures.join('; ')}`, timestamp);
    }

    // 6. Run pre-trade simulation
    const simResult = await simulate(decision, userId);

    if (!simResult.passed) {
      await logAudit(supabase, userId, decision, 'blocked_by_simulation', simResult.reasons);
      return failResult(`Pre-trade simulation failed: ${simResult.reasons.join('; ')}`, timestamp);
    }

    // 7. Paper or live execution
    // Décision Tissma D2=A (2026-09-05) : MIDAS reste en simulation éducative.
    // Les ordres non-paper ne peuvent partir QUE vers une connexion testnet —
    // aucun ordre sur fonds réels, même si une connexion ancienne est marquée
    // réelle en base. Garde interne : contournement route HTTP impossible.
    const exchangeConn = connection as ExchangeConnectionRow;
    if (options.forcePaper || !exchangeConn.is_testnet) {
      const paperResult = await executePaperTrade(decision, userId, options.quoteAmount);
      await logAudit(supabase, userId, decision, 'paper_executed', []);
      return paperResult;
    }

    // 8. Live execution via ccxt
    const intentKey = randomUUID();
    const { data: intent, error: intentError } = await supabase.from('trade_execution_intents').insert({
      user_id: userId,
      exchange_connection_id: exchangeConnectionId,
      idempotency_key: intentKey,
      purpose: 'open',
      symbol: decision.pair,
      side: decision.action,
      status: 'prepared',
    }).select('id').single();
    if (intentError || !intent) {
      return failResult('Unable to create durable execution intent; no order was sent', timestamp);
    }

    let liveResult: TradeResult;
    try {
      liveResult = await executeLiveOrder(exchangeConn, decision, userProfile.capital_usd, options.quoteAmount);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown live execution error';
      await supabase.from('trade_execution_intents').update({
        status: 'unknown',
        error: message,
        updated_at: new Date().toISOString(),
      }).eq('id', intent.id);
      return failResult(`Live order result unknown; broker reconciliation required: ${message}`, timestamp);
    }
    await supabase.from('trade_execution_intents').update({
      exchange_order_id: liveResult.order_id,
      requested_quantity: liveResult.executed_quantity,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    }).eq('id', intent.id);

    // 9. Save trade to DB
    const { data: savedTrade, error: saveError } = await supabase.from('trades').insert({
      user_id: userId,
      exchange_connection_id: exchangeConnectionId,
      exchange: exchangeConn.exchange,
      pair: decision.pair,
      side: decision.action === 'buy' ? 'buy' : 'sell',
      type: 'market',
      entry_price: liveResult.executed_price,
      quantity: liveResult.executed_quantity,
      quote_amount: liveResult.executed_price * liveResult.executed_quantity,
      stop_loss: decision.stop_loss,
      take_profit: decision.take_profit,
      status: 'open',
      fees: liveResult.fees,
      slippage_pct: liveResult.slippage_pct,
      exchange_order_id: liveResult.order_id,
      strategy: decision.strategy,
      confidence: decision.confidence,
      ai_reasoning: decision.reasoning,
      composite_score: decision.composite_score,
      risk_reward_ratio: decision.risk_reward_ratio,
      agent_results: decision.agent_results,
      is_paper_trade: false,
    }).select('id').single();

    if (saveError || !savedTrade) {
      await supabase.from('trade_execution_intents').update({
        status: 'unknown',
        error: `Order confirmed but trade persistence failed: ${saveError?.message ?? 'unknown error'}`,
        updated_at: new Date().toISOString(),
      }).eq('id', intent.id);
      return { ...liveResult, success: false, error: 'Order executed but local tracking failed; reconciliation required' };
    }

    liveResult.trade_id = savedTrade?.id ?? null;
    await supabase.from('trade_execution_intents').update({ trade_id: savedTrade.id }).eq('id', intent.id);

    // 10. Audit log
    await logAudit(supabase, userId, decision, 'live_executed', []);

    return liveResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown execution error';
    return failResult(message, timestamp);
  }
}

async function executeLiveOrder(
  connection: ExchangeConnectionRow,
  decision: CoordinatorDecision,
  configuredCapital: number,
  requestedQuoteAmount?: number,
): Promise<TradeResult> {
  const exchangeName = connection.exchange;
  if (!isSupportedExchange(exchangeName)) {
    throw new Error(`Unsupported exchange: ${exchangeName}`);
  }

  // Decrypt API keys before passing to ccxt
  const apiKey = decrypt(connection.api_key_encrypted, connection.api_key_iv);
  const apiSecret = decrypt(connection.api_secret_encrypted, connection.api_secret_iv);

  const client = createExchangeClient(exchangeName, {
    apiKey,
    secret: apiSecret,
    testnet: connection.is_testnet,
  });

  await client.loadMarkets();
  const market = client.market(decision.pair);
  const ticker = await client.fetchTicker(decision.pair);
  const marketPrice = Number(ticker.last ?? ticker.ask ?? ticker.bid);
  const balance = await client.fetchBalance();
  const balances = balance as unknown as Record<string, { free?: number } | undefined>;
  const side = decision.action === 'buy' ? 'buy' : 'sell';
  const sizing = calculateSpotOrderSize({
    side,
    price: marketPrice,
    positionSizePct: decision.position_size_pct,
    configuredCapital,
    requestedQuoteAmount,
    freeBase: Number(balances[market.base]?.free ?? 0),
    freeQuote: Number(balances[market.quote]?.free ?? 0),
  });
  const quantity = normalizeQuantity(client, market, sizing.quantity, marketPrice);
  let order = await client.createMarketOrder(decision.pair, side, quantity);
  if ((!order.filled || !order.average) && order.id && client.has.fetchOrder) {
    order = await client.fetchOrder(order.id, decision.pair);
  }
  const execution = confirmedExecution(order);
  const executedPrice = execution.price;
  const executedQty = execution.quantity;
  const fees = execution.fees;
  const slippage =
    decision.entry_price > 0
      ? ((executedPrice - decision.entry_price) / decision.entry_price) * 100
      : 0;

  return {
    success: true,
    trade_id: null,
    order_id: (order.id as string) ?? null,
    executed_price: executedPrice,
    executed_quantity: executedQty,
    fees,
    slippage_pct: Math.abs(slippage),
    is_paper: false,
    error: null,
    timestamp: Date.now(),
  };
}

function failResult(error: string, timestamp: number): TradeResult {
  return {
    success: false,
    trade_id: null,
    order_id: null,
    executed_price: 0,
    executed_quantity: 0,
    fees: 0,
    slippage_pct: 0,
    is_paper: true,
    error,
    timestamp,
  };
}

async function logAudit(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  decision: CoordinatorDecision,
  action: string,
  details: string[]
): Promise<void> {
  await supabase.from('trade_audit_logs').insert({
    user_id: userId,
    action,
    symbol: decision.pair,
    side: decision.action,
    confidence: decision.confidence,
    entry_price: decision.entry_price,
    stop_loss: decision.stop_loss,
    take_profit: decision.take_profit,
    position_size_pct: decision.position_size_pct,
    strategy: decision.strategy,
    details: { failures: details, reasoning: decision.reasoning },
    created_at: new Date().toISOString(),
  });
}
