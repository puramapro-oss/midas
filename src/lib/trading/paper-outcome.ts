import { validateOperationId } from './paper-validation.ts';

export interface TradeResult {
  success: boolean;
  trade_id: string | null;
  order_id: string | null;
  operation_id: string | null;
  executed_price: number;
  executed_quantity: number;
  fees: number;
  slippage_pct: number;
  is_paper: boolean;
  error: string | null;
  timestamp: number;
  state: 'not_executed' | 'paper_executed' | 'reconciliation_required';
  audit_status: 'not_recorded' | 'recorded' | 'unknown';
  replayed?: boolean;
}


export function paperFailure(error: string, operationId: string | null, uncertain = false): TradeResult {
  return {
    success: false, trade_id: null, order_id: operationId ? `PAPER-${operationId}` : null,
    operation_id: operationId, executed_price: 0, executed_quantity: 0, fees: 0, slippage_pct: 0,
    is_paper: true, error, timestamp: Date.now(),
    state: uncertain ? 'reconciliation_required' : 'not_executed',
    audit_status: uncertain ? 'unknown' : 'not_recorded',
  };
}

export function parsePaperReceipt(value: unknown, operationId: string): TradeResult {
  operationId = validateOperationId(operationId);
  if (!value || typeof value !== 'object') throw new Error('Invalid paper receipt');
  const receipt = value as Record<string, unknown>;
  if (receipt.success !== true || receipt.is_paper !== true || receipt.operation_id !== operationId ||
      typeof receipt.trade_id !== 'string' || !receipt.trade_id || receipt.order_id !== `PAPER-${operationId}` ||
      receipt.state !== 'paper_executed' || receipt.audit_status !== 'recorded' || receipt.error !== null) {
    throw new Error('Invalid paper receipt');
  }
  for (const key of ['executed_price', 'executed_quantity', 'fees', 'slippage_pct', 'timestamp']) {
    const n = receipt[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) throw new Error('Invalid paper receipt amount');
  }
  if ((receipt.executed_price as number) <= 0 || (receipt.executed_quantity as number) <= 0) throw new Error('Empty paper receipt');
  return receipt as unknown as TradeResult;
}
