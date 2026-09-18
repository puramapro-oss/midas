// =============================================================================
// MIDAS — Trade Executor
// Execute educational paper trades with a full audit trail
// =============================================================================

import type { CoordinatorDecision } from '@/lib/agents/types';
import { createServiceClient } from '@/lib/supabase/server';
import { simulate } from './pre-trade-simulation';
import { executePaperTrade } from './paper-trading-engine';

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

// Décision Tissma D2=A (2026-09-05), contrat check-niyama-decisions.mjs :
// MIDAS reste en simulation éducative — aucun ordre vers un exchange, même
// testnet, n'est envoyé depuis cet exécuteur. La route HTTP (/api/trade/*)
// est 403 D2=A par le middleware ; cette garde interne empêche tout
// contournement par un appel direct à la fonction.
export async function executeTrade(
  decision: CoordinatorDecision,
  userId: string,
  options: { quoteAmount?: number } = {},
): Promise<TradeResult> {
  const timestamp = Date.now();
  const supabase = createServiceClient();

  try {
    // 1. Pre-trade simulation — pipeline Shield complet (profil, limites,
    //    positions ouvertes, circuit breaker 30j, crash-protection BTC).
    //    Source unique du gate risque : ne PAS dupliquer les requêtes ici.
    const simResult = await simulate(decision, userId);

    if (!simResult.passed) {
      await logAudit(supabase, userId, decision, 'blocked_by_simulation', simResult.reasons);
      return failResult(`Pre-trade simulation failed: ${simResult.reasons.join('; ')}`, timestamp);
    }

    // 2. Exécution paper uniquement
    const paperResult = await executePaperTrade(decision, userId, options.quoteAmount);
    await logAudit(supabase, userId, decision, 'paper_executed', []);
    return paperResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown execution error';
    return failResult(message, timestamp);
  }
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
