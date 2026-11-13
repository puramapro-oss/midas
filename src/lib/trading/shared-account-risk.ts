/** Capacity contract for the EXISTING authenticated MIDAS backend/database.
 * No transport, credential, route or execution engine is created here.
 * Unconfigured authority and every ambiguous response fail closed. A capacity
 * receipt cannot enable live trading or replace the existing execution journal.
 */
const CONTRACT = 'purama.shared-account-risk.v1';
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const AMOUNT = /^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,12})?$/;
type JsonRecord = Record<string, unknown>;
export type RiskBinding = Readonly<{
  account_key: string; authority_id: string; writer: 'midas' | 'jev'; currency: string;
}>;
export type RiskIntent = Readonly<{
  operation_id: string; intent_hash: string; snapshot_hash: string;
  costs_hash: string; loss: string; margin: string;
}>;
export type RiskTarget = 'SUBMITTING' | 'UNKNOWN' | 'CANCELLED_UNSENT';
export type RiskReceipt = Readonly<{
  contract: string; account_key: string; authority_id: string; writer: string;
  currency: string; operation_id: string; intent_hash: string; snapshot_hash: string;
  fencing: string; state: 'RESERVED' | 'SUBMITTING' | 'UNKNOWN' | 'RELEASED';
  applied: boolean; loss: string; margin: string;
  execution_authority: false; live_release: 'LOCKED';
}>;
export type RiskRpc = (name: 'purama_shared_risk_reserve' | 'purama_shared_risk_transition',
  parameters: JsonRecord) => PromiseLike<{ data: unknown; error: unknown }>;

function object(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function valid(value: unknown, pattern: RegExp): value is string {
  return typeof value === 'string' && pattern.test(value);
}
function amount(value: unknown, positive = false): value is string {
  return valid(value, AMOUNT) && (!positive || /[1-9]/.test(value));
}
function fence(value: unknown): value is string {
  return valid(value, /^[1-9][0-9]{0,18}$/) && BigInt(value) <= BigInt('9223372036854775807');
}
function decimal(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${fraction.replace(/0+$/, '')}`;
}
function blocked(code: string): never { throw new Error(code); }

export class SharedAccountRisk {
  private readonly binding: RiskBinding;
  private readonly rpc?: RiskRpc;

  constructor(binding: RiskBinding, rpc?: RiskRpc) {
    if (typeof window !== 'undefined') blocked('SHARED_RISK_SERVER_ONLY');
    if (!object(binding) || !valid(binding.account_key, HASH) || !valid(binding.authority_id, UUID)
      || !['jev', 'midas'].includes(binding.writer) || !valid(binding.currency, /^[A-Z]{3,8}$/)
      || (rpc !== undefined && typeof rpc !== 'function')) blocked('SHARED_RISK_ACCOUNT_BINDING_REQUIRED');
    this.binding = Object.freeze({ ...binding });
    this.rpc = rpc;
  }

  private async call(name: 'purama_shared_risk_reserve' | 'purama_shared_risk_transition',
    parameters: JsonRecord, operation: string, intent?: RiskIntent, fencing?: string,
    target?: RiskTarget): Promise<RiskReceipt> {
    if (!this.rpc) blocked('SHARED_RISK_AUTHORITY_UNAVAILABLE');
    let response: unknown;
    try {
      // Exactly one RPC. On timeout the database may already have committed.
      // Never retry, release capacity or mint a different operation id here.
      response = await this.rpc(name, { p_account_key: this.binding.account_key,
        p_authority_id: this.binding.authority_id, p_writer: this.binding.writer, ...parameters });
    } catch { blocked('SHARED_RISK_AUTHORITY_UNCERTAIN'); }
    if (!object(response) || response.error !== null || !object(response.data))
      blocked('SHARED_RISK_AUTHORITY_UNCERTAIN');
    const data = response.data;
    const expected = { contract: CONTRACT, ...this.binding, operation_id: operation, live_release: 'LOCKED' };
    if (Object.entries(expected).some(([key, value]) => data[key] !== value)
      || data.execution_authority !== false || typeof data.applied !== 'boolean'
      || !['RESERVED', 'SUBMITTING', 'UNKNOWN', 'RELEASED'].includes(String(data.state))
      || !fence(data.fencing) || !valid(data.intent_hash, HASH) || !valid(data.snapshot_hash, HASH)
      || !amount(data.loss, true) || !amount(data.margin)) blocked('SHARED_RISK_INVALID_RECEIPT');
    if (fencing !== undefined && data.fencing !== fencing) blocked('SHARED_RISK_FENCE_LOST');
    if (intent && (data.intent_hash !== intent.intent_hash || data.snapshot_hash !== intent.snapshot_hash
      || decimal(data.loss as string) !== decimal(intent.loss)
      || decimal(data.margin as string) !== decimal(intent.margin)
      || (data.applied && data.state !== 'RESERVED'))) blocked('SHARED_RISK_INVALID_RECEIPT');
    if (target && data.state !== (target === 'CANCELLED_UNSENT' ? 'RELEASED' : target))
      blocked('SHARED_RISK_INVALID_RECEIPT');
    return Object.freeze({ ...data }) as RiskReceipt;
  }

  reserve(intent: RiskIntent): Promise<RiskReceipt> {
    if (!object(intent) || Object.keys(intent).sort().join(',') !==
      'costs_hash,intent_hash,loss,margin,operation_id,snapshot_hash'
      || !valid(intent.operation_id, UUID) || !valid(intent.intent_hash, HASH)
      || !valid(intent.snapshot_hash, HASH) || !valid(intent.costs_hash, HASH)
      || !amount(intent.loss, true) || !amount(intent.margin)) blocked('SHARED_RISK_REQUEST_REQUIRED');
    const request = { ...intent, currency: this.binding.currency };
    return this.call('purama_shared_risk_reserve', { p_request: request }, intent.operation_id, intent);
  }

  transition(operationId: string, fencing: string, target: RiskTarget): Promise<RiskReceipt> {
    if (!valid(operationId, UUID) || !fence(fencing)) blocked('SHARED_RISK_FENCE_LOST');
    if (!['SUBMITTING', 'UNKNOWN', 'CANCELLED_UNSENT'].includes(target)) blocked('SHARED_RISK_TRANSITION_INVALID');
    return this.call('purama_shared_risk_transition', { p_operation_id: operationId,
      p_fencing: fencing, p_target: target }, operationId, undefined, fencing, target);
  }
}
