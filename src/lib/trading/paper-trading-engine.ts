// Educational execution only. The database commits the trade, audit and receipt
// together and replays the stored receipt for the same operation identifier.
import type { CoordinatorDecision } from '@/lib/agents/types';
import { createServiceClient } from '@/lib/supabase/server';
import type { TradeResult } from './paper-outcome';
import { samePaperRequest, validateOperationId } from './paper-validation';
import { parsePaperReceipt, paperFailure } from './paper-outcome';

// Shared with the close route and verified against the atomic SQL function.
export const PAPER_FEE_RATE = 0.001;
export interface PaperExecutionOptions {
  operationId: string;
  quoteAmount?: number;
  dailyLimit?: number;
  maxPositions?: number;
}

export async function findPaperExecution(
  decision: CoordinatorDecision, userId: string, options: PaperExecutionOptions,
): Promise<TradeResult | null> {
  validateOperationId(options.operationId);
  const { data, error } = await createServiceClient().from('trade_execution_intents')
    .select('execution_mode, request_payload, exchange_response, status')
    .eq('user_id', userId)
    .eq('idempotency_key', options.operationId)
    .maybeSingle();
  if (error) throw new Error('Paper receipt lookup unavailable');
  if (!data) return null;
  if (data.execution_mode !== 'paper' || !samePaperRequest(data.request_payload, decision, options.quoteAmount)) {
    return paperFailure('Operation identifier already belongs to a different request', options.operationId);
  }
  if (data.status !== 'confirmed') return paperFailure('Operation requires reconciliation', options.operationId, true);
  return { ...parsePaperReceipt(data.exchange_response, options.operationId), replayed: true };
}

export async function executePaperTrade(
  decision: CoordinatorDecision, userId: string, options: PaperExecutionOptions,
): Promise<TradeResult> {
  validateOperationId(options.operationId);
  try {
    const { data, error } = await createServiceClient().rpc('midas_execute_paper_trade', {
      p_user_id: userId,
      p_operation_id: options.operationId,
      p_decision: decision,
      p_quote_amount: options.quoteAmount ?? null,
      p_daily_limit: options.dailyLimit ?? 5,
      p_max_positions: options.maxPositions ?? 3,
    });
    // A transport error can occur after COMMIT. Never claim that nothing was
    // saved, and never manufacture a new operation identifier for a retry.
    if (error) return paperFailure('Paper execution unconfirmed; retry only with the same operation identifier', options.operationId, true);
    return parsePaperReceipt(data, options.operationId);
  } catch {
    return paperFailure('Paper execution requires reconciliation', options.operationId, true);
  }
}
