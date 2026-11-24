import { isValidIban } from './iban';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function readWalletAmount(value: unknown): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value))) {
    throw new Error('withdrawal_receipt_invalid');
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(Math.round(number * 100)) ||
      Math.round(number * 100) / 100 !== number) throw new Error('withdrawal_receipt_invalid');
  return number;
}

export function readWalletWithdrawalReceipt(value: unknown, expected: {
  userId: string; requestId: string; amount?: number; iban?: string;
}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('withdrawal_receipt_invalid');
  const row = value as Record<string, unknown>;
  const amount = readWalletAmount(row.amount);
  const balance = readWalletAmount(row.wallet_balance);
  if (typeof row.id !== 'string' || !UUID.test(row.id) || row.id !== expected.requestId ||
      typeof row.user_id !== 'string' || !UUID.test(row.user_id) || row.user_id !== expected.userId ||
      amount < 5 || amount > 9_999_999_999.99 ||
      typeof row.iban !== 'string' || !isValidIban(row.iban) ||
      row.debit_confirmed !== true || row.rejection_recorded !== false || row.admission_rejection !== null || typeof row.applied !== 'boolean' ||
      !['pending', 'processed', 'rejected'].includes(String(row.status)) ||
      row.refunded !== (row.status === 'rejected') || (row.applied && row.status !== 'pending') ||
      (expected.amount !== undefined && amount !== expected.amount) ||
      (expected.iban !== undefined && row.iban !== expected.iban)) throw new Error('withdrawal_receipt_mismatch');
  return {
    ok: true as const, withdrawal_id: row.id, user_id: row.user_id, idempotency_key: row.id,
    amount_eur: amount, new_balance_eur: balance,
    status: row.status as 'pending' | 'processed' | 'rejected', debit_confirmed: true as const,
    refunded: row.refunded, replayed: !row.applied, iban_last4: row.iban.slice(-4),
  };
}

export function readWalletWithdrawalRejection(value: unknown, expected: {
  userId: string; requestId: string; amount?: number; iban?: string;
}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('withdrawal_receipt_invalid');
  const row = value as Record<string, unknown>;
  if (row.rejection_recorded !== true) return null;
  const amount = readWalletAmount(row.amount);
  readWalletAmount(row.wallet_balance);
  if (typeof row.id !== 'string' || !UUID.test(row.id) || row.id !== expected.requestId ||
      row.user_id !== expected.userId || typeof row.iban !== 'string' || !isValidIban(row.iban) ||
      row.status !== 'rejected' || row.debit_confirmed !== false || row.refunded !== false || typeof row.applied !== 'boolean' ||
      amount < 5 || amount > 9_999_999_999.99 ||
      !['insufficient_balance', 'withdrawal_pending', 'withdrawal_locked_30d'].includes(String(row.admission_rejection)) ||
      (expected.amount !== undefined && amount !== expected.amount) ||
      (expected.iban !== undefined && row.iban !== expected.iban)) throw new Error('withdrawal_rejection_invalid');
  return {
    request_closed: true, rejection_recorded: true, debit_confirmed: false, refunded: false,
    withdrawal_id: row.id, idempotency_key: row.id, user_id: expected.userId, code: String(row.admission_rejection),
    error: row.admission_rejection === 'insufficient_balance' ? 'Solde insuffisant.'
      : row.admission_rejection === 'withdrawal_pending' ? 'Une demande de retrait est déjà en cours.'
        : 'Le délai de 30 jours après souscription n’est pas terminé.',
  };
}
