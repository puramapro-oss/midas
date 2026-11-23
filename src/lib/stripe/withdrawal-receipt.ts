// Both the synchronous provider response and signed webhooks must prove the
// same journal identity. Missing fields are never interpreted as success.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCOUNT = /^acct_[A-Za-z0-9]+$/;
const TRANSFER = /^tr_[A-Za-z0-9]+$/;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('withdrawal_receipt_invalid');
  }
  return value as Record<string, unknown>;
}

function identifier(value: unknown, pattern: RegExp): string {
  if (typeof value !== 'string' || !pattern.test(value)) throw new Error('withdrawal_receipt_invalid');
  return value;
}

function euros(value: unknown): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value))) {
    throw new Error('withdrawal_receipt_invalid');
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 100)) ||
      Math.round(amount * 100) / 100 !== amount) throw new Error('withdrawal_receipt_invalid');
  return amount;
}

export type WithdrawalReceipt = {
  id: string;
  user_id: string;
  request_key: string;
  ledger_version: 1;
  amount_eur: number;
  stripe_account_id: string;
  currency: 'eur';
  status: 'pending' | 'reversed';
  stripe_transfer_id: string | null;
  provider_confirmed: boolean;
  credited_reversal_eur: number;
  credited_eur: number;
  wallet_balance: number;
  applied: boolean;
};

type ExpectedReceipt = {
  userId: string;
  requestKey?: string;
  withdrawalId?: string;
  destination: string;
  amount?: number;
  transferId?: string;
};

export function readWithdrawalReceipt(value: unknown, expected: ExpectedReceipt): WithdrawalReceipt {
  const row = record(value);
  const id = identifier(row.id, UUID);
  const userId = identifier(row.user_id, UUID);
  const requestKey = identifier(row.request_key, UUID);
  const accountId = identifier(row.stripe_account_id, ACCOUNT);
  const amount = euros(row.amount_eur);
  const balance = euros(row.wallet_balance);
  const reversed = euros(row.credited_reversal_eur);
  const credited = euros(row.credited_eur);
  const transferId = row.stripe_transfer_id === null ? null : identifier(row.stripe_transfer_id, TRANSFER);
  if (row.ledger_version !== 1 || row.currency !== 'eur' || row.rejection_recorded !== false ||
      row.admission_rejection !== null || row.debit_confirmed !== true ||
      typeof row.provider_confirmed !== 'boolean' || typeof row.applied !== 'boolean' ||
      !['pending', 'reversed'].includes(String(row.status)) ||
      amount < 20 || amount > 100_000 || reversed > amount || credited > reversed || (credited > 0 && !row.applied) ||
      (row.status === 'reversed') !== (reversed === amount) ||
      row.provider_confirmed !== (transferId !== null) || (!row.provider_confirmed && reversed !== 0) ||
      userId !== expected.userId || accountId !== expected.destination ||
      (expected.requestKey !== undefined && requestKey !== expected.requestKey) ||
      (expected.withdrawalId !== undefined && id !== expected.withdrawalId) ||
      (expected.amount !== undefined && amount !== expected.amount) ||
      (expected.transferId !== undefined && transferId !== expected.transferId)) {
    throw new Error('withdrawal_receipt_mismatch');
  }
  return {
    id, user_id: userId, request_key: requestKey, ledger_version: 1,
    amount_eur: amount, stripe_account_id: accountId, currency: 'eur',
    status: row.status as WithdrawalReceipt['status'], stripe_transfer_id: transferId,
    provider_confirmed: row.provider_confirmed, credited_reversal_eur: reversed,
    credited_eur: credited, wallet_balance: balance, applied: row.applied,
  };
}

export function readWithdrawalRejection(value: unknown, expected: ExpectedReceipt) {
  const row = record(value);
  if (row.rejection_recorded !== true) return null;
  const id = identifier(row.id, UUID);
  const userId = identifier(row.user_id, UUID);
  const requestKey = identifier(row.request_key, UUID);
  const destination = identifier(row.stripe_account_id, ACCOUNT);
  const amount = euros(row.amount_eur);
  euros(row.wallet_balance);
  if (row.ledger_version !== 1 || row.currency !== 'eur' || row.status !== 'failed' ||
      row.provider_confirmed !== false || row.stripe_transfer_id !== null ||
      row.debit_confirmed !== false || row.refunded !== false || typeof row.applied !== 'boolean' ||
      euros(row.credited_reversal_eur) !== 0 || euros(row.credited_eur) !== 0 || amount < 20 || amount > 100_000 ||
      !['withdrawal_cap_exceeded', 'insufficient_balance'].includes(String(row.admission_rejection)) ||
      userId !== expected.userId || requestKey !== expected.requestKey || destination !== expected.destination ||
      (expected.amount !== undefined && amount !== expected.amount)) throw new Error('withdrawal_rejection_invalid');
  return {
    request_closed: true, rejection_recorded: true, debit_confirmed: false, refunded: false,
    user_id: userId, idempotency_key: requestKey, withdrawal_id: id, stripe_account_id: destination,
    code: row.admission_rejection === 'insufficient_balance' ? 'withdrawal_invalid_amount' : 'withdrawal_cap_exceeded',
    error: row.admission_rejection === 'insufficient_balance' ? 'Montant indisponible sur ce wallet.' : 'Le montant dépasse ton plafond de retrait.',
  };
}

export type WithdrawalTransferObservation = {
  p_user_id: string;
  p_withdrawal_id: string;
  p_transfer_id: string;
  p_destination: string;
  p_amount: number;
  p_currency: 'eur';
  p_reversed_amount: number;
};

export function readWithdrawalTransfer(value: unknown): WithdrawalTransferObservation {
  const transfer = record(value);
  const metadata = record(transfer.metadata);
  const transferId = identifier(transfer.id, TRANSFER);
  const destination = identifier(typeof transfer.destination === 'string'
    ? transfer.destination : record(transfer.destination).id, ACCOUNT);
  const userId = identifier(metadata.user_id, UUID);
  const withdrawalId = identifier(metadata.withdrawal_id, UUID);
  const amount = transfer.amount;
  const reversed = transfer.amount_reversed;
  if (transfer.object !== 'transfer' || metadata.app !== 'midas' || metadata.source !== 'connect_withdraw' ||
      transfer.currency !== 'eur' || typeof amount !== 'number' || !Number.isSafeInteger(amount) ||
      amount < 2_000 || amount > 10_000_000 || typeof reversed !== 'number' || !Number.isSafeInteger(reversed) ||
      reversed < 0 || reversed > amount || typeof transfer.reversed !== 'boolean' ||
      transfer.reversed !== (reversed === amount)) {
    throw new Error('withdrawal_transfer_invalid');
  }
  return {
    p_user_id: userId, p_withdrawal_id: withdrawalId, p_transfer_id: transferId,
    p_destination: destination, p_amount: amount / 100, p_currency: 'eur', p_reversed_amount: reversed / 100,
  };
}
