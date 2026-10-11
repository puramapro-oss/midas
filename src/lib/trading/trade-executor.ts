// MIDAS — educational paper executor. No exchange order is sent, including testnet.
import type { CoordinatorDecision } from '@/lib/agents/types';
import { createServiceClient } from '@/lib/supabase/server';
import { simulate } from './pre-trade-simulation';
import { executePaperTrade, findPaperExecution, type PaperExecutionOptions } from './paper-trading-engine';
import { paperFailure } from './paper-outcome';
import { validateOperationId } from './paper-validation';

export type { TradeResult } from './paper-outcome';
import type { TradeResult } from './paper-outcome';

// D2=A remains enforced in middleware; no public trading path is enabled here.
export async function executeTrade(
  decision: CoordinatorDecision, userId: string, options: PaperExecutionOptions,
): Promise<TradeResult> {
  try {
    validateOperationId(options?.operationId);
    if (!userId?.trim()) throw new Error('Account required');
  } catch {
    return paperFailure('A stable operation identifier and an account are required', null);
  }
  // Reconcile BEFORE simulation: an already committed operation may now exceed
  // a quota or fail a new market-data check, but its receipt must still be returned.
  try {
    const previous = await findPaperExecution(decision, userId, options);
    if (previous) return previous;
  } catch {
    return paperFailure('Cannot verify the previous operation; retry with the same identifier', options.operationId, true);
  }
  try {
    const result = await simulate(decision, userId, options.quoteAmount);
    if (!result.passed) {
      const { error } = await createServiceClient().from('trade_audit_logs').insert({
        user_id: userId, action: 'blocked_by_simulation', symbol: decision.pair,
        side: decision.action, details: { failures: result.reasons, operation_id: options.operationId },
      });
      return paperFailure(error ? 'Simulation blocked; audit unavailable' : `Pre-trade simulation failed: ${result.reasons.join('; ')}`, options.operationId);
    }
  } catch {
    return paperFailure('Paper validation unavailable; no execution submitted', options.operationId);
  }
  // Success is recorded atomically by SQL. Do not perform a second fallible
  // audit write here after the trade has already been committed.
  return executePaperTrade(decision, userId, options);
}
