import { createServiceClient } from '@/lib/supabase/server';
import type { PaperQuote } from '@/lib/exchange/binance-public';
import { validateOperationId } from './paper-validation';

export interface PaperMonitorAction {
  position_id: string;
  action: 'close_manual' | 'close_sl' | 'close_tp' | 'close_trailing' | 'move_breakeven' | 'update_trailing';
  reason: string;
  new_stop_loss: number | null;
  close_price: number | null;
}
export interface PaperObservationResult {
  trade: Record<string, unknown>;
  replayed: boolean;
  actions: PaperMonitorAction[];
}
export async function applyPaperObservation(userId: string, tradeId: string, quote: PaperQuote, manualClose = false): Promise<PaperObservationResult> {
  tradeId = validateOperationId(tradeId);
  if (!userId || quote.source !== 'binance_aggTrades' || !Number.isFinite(quote.price) || quote.price <= 0 ||
      !Number.isSafeInteger(quote.observed_at) || quote.observed_at < Date.now() - 120000 || quote.observed_at > Date.now() + 5000) {
    throw new Error('Invalid or stale paper observation');
  }
  const { data, error } = await createServiceClient().rpc('midas_apply_paper_observation', {
    p_user_id: userId, p_trade_id: tradeId, p_price: quote.price,
    p_observed_at: new Date(quote.observed_at).toISOString(), p_manual_close: manualClose,
  }).abortSignal(AbortSignal.timeout(8000));
  if (error || !data || typeof data !== 'object') throw new Error('Paper observation unconfirmed; retry the same trade');
  const result = data as PaperObservationResult;
  if (result.trade?.id !== tradeId || result.trade?.user_id !== userId || result.trade?.is_paper_trade !== true ||
      !['open', 'closed'].includes(String(result.trade.status)) || typeof result.replayed !== 'boolean' || !Array.isArray(result.actions) ||
      result.actions.some(a => a.position_id !== tradeId || !['close_manual', 'close_sl', 'close_tp', 'close_trailing', 'move_breakeven', 'update_trailing'].includes(a.action))) {
    throw new Error('Invalid paper observation receipt; reconciliation required');
  }
  return result;
}
