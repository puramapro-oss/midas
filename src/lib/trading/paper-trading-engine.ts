// =============================================================================
// MIDAS — Paper Trading Engine
// Simulated trade execution with real prices, fake slippage, and fees
// =============================================================================

import type { CoordinatorDecision } from '@/lib/agents/types';
import { createServiceClient } from '@/lib/supabase/server';
import type { TradeResult } from './trade-executor';

const PAPER_FEE_RATE = 0.001; // 0.1% maker fee simulation
const PAPER_SLIPPAGE_RANGE = { min: 0.01, max: 0.15 }; // 0.01% to 0.15%

export async function executePaperTrade(
  decision: CoordinatorDecision,
  userId: string
): Promise<TradeResult> {
  const supabase = createServiceClient();
  const timestamp = Date.now();

  if (decision.action === 'hold') {
    return {
      success: false,
      trade_id: null,
      order_id: null,
      executed_price: 0,
      executed_quantity: 0,
      fees: 0,
      slippage_pct: 0,
      is_paper: true,
      error: 'Cannot execute paper trade for hold action',
      timestamp,
    };
  }

  // Simulate realistic slippage
  const slippagePct = simulateSlippage(decision.pair);
  const slippageDirection = decision.action === 'buy' ? 1 : -1;
  const executedPrice = decision.entry_price * (1 + (slippagePct / 100) * slippageDirection);

  // Get user's paper trading capital
  const { data: settings } = await supabase
    .from('trading_settings')
    .select('paper_capital, capital_usd')
    .eq('user_id', userId)
    .single();

  const paperCapital = Number(settings?.paper_capital ?? settings?.capital_usd ?? 10000);

  // Calculate position size
  const riskPct = decision.position_size_pct;
  const positionValue = paperCapital * (riskPct / 100);
  const quantity = executedPrice > 0 ? positionValue / executedPrice : 0;

  if (quantity <= 0) {
    return {
      success: false,
      trade_id: null,
      order_id: null,
      executed_price: executedPrice,
      executed_quantity: 0,
      fees: 0,
      slippage_pct: slippagePct,
      is_paper: true,
      error: 'Calculated quantity is zero or negative',
      timestamp,
    };
  }

  // Calculate fees
  const fees = quantity * executedPrice * PAPER_FEE_RATE;

  // Generate a deterministic paper order ID
  const orderId = `PAPER-${userId.slice(0, 8)}-${timestamp}`;

  // Save paper trade to DB
  const { data: savedTrade, error: saveError } = await supabase
    .from('trades')
    .insert({
      user_id: userId,
      symbol: decision.pair,
      side: decision.action === 'buy' ? 'buy' : 'sell',
      type: 'market',
      entry_price: executedPrice,
      quantity,
      leverage: 1,
      stop_loss: decision.stop_loss,
      take_profit: decision.take_profit,
      status: 'open',
      fees,
      slippage_pct: slippagePct,
      order_id: orderId,
      strategy: decision.strategy,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      is_paper: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (saveError) {
    return {
      success: false,
      trade_id: null,
      order_id: orderId,
      executed_price: executedPrice,
      executed_quantity: quantity,
      fees,
      slippage_pct: slippagePct,
      is_paper: true,
      error: `Failed to save paper trade: ${saveError.message}`,
      timestamp,
    };
  }

  return {
    success: true,
    trade_id: savedTrade?.id ?? null,
    order_id: orderId,
    executed_price: executedPrice,
    executed_quantity: quantity,
    fees,
    slippage_pct: slippagePct,
    is_paper: true,
    error: null,
    timestamp,
  };
}

function simulateSlippage(pair: string): number {
  const upperPair = pair.toUpperCase();

  // Major pairs get lower slippage
  const majorPairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'];
  const isMajor = majorPairs.includes(upperPair);

  const min = isMajor ? PAPER_SLIPPAGE_RANGE.min : PAPER_SLIPPAGE_RANGE.min * 2;
  const max = isMajor ? PAPER_SLIPPAGE_RANGE.max / 2 : PAPER_SLIPPAGE_RANGE.max;

  // Deterministic-ish but varied: use timestamp modulus for pseudo-random
  const seed = Date.now() % 1000;
  const normalized = seed / 1000;

  return min + normalized * (max - min);
}
