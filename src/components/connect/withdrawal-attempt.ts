// A request survives network uncertainty and is scoped to both identities.
// There is no timeout that silently turns an old request into a new transfer.
export type WithdrawalAttempt = Readonly<{
  version: 1;
  userId: string;
  accountId: string;
  key: string;
  amountEur: number;
}>;
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const storageKey = (userId: string, accountId: string) => `midas:withdrawal:v1:${userId}:${accountId}`;
function amountValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 20 && value <= 100_000 &&
    Math.round(value * 100) / 100 === value;
}

export function readWithdrawalAttempt(storage: StoragePort, userId: string, accountId: string): WithdrawalAttempt | null {
  if (!UUID.test(userId) || !/^acct_[a-zA-Z0-9]+$/.test(accountId)) throw new Error('Identité de retrait invalide.');
  const raw = storage.getItem(storageKey(userId, accountId));
  if (raw === null) return null;
  const value = JSON.parse(raw) as Partial<WithdrawalAttempt> | null;
  if (!value || value.version !== 1 || value.userId !== userId || value.accountId !== accountId ||
      typeof value.key !== 'string' || !UUID.test(value.key) || !amountValid(value.amountEur)) {
    throw new Error('Le suivi de la demande existante nécessite une vérification. Aucun nouveau retrait n’a été envoyé.');
  }
  return Object.freeze(value as WithdrawalAttempt);
}

export function prepareWithdrawalAttempt(
  storage: StoragePort, userId: string, accountId: string, amountEur: number, newKey: () => string,
): WithdrawalAttempt {
  const pending = readWithdrawalAttempt(storage, userId, accountId);
  if (pending) return pending;
  const key = newKey();
  if (!UUID.test(key) || !amountValid(amountEur)) throw new Error('Montant ou identifiant de demande invalide.');
  const value = Object.freeze({ version: 1 as const, userId, accountId, key, amountEur });
  storage.setItem(storageKey(userId, accountId), JSON.stringify(value));
  const persisted = readWithdrawalAttempt(storage, userId, accountId);
  if (!persisted || persisted.key !== key || persisted.amountEur !== amountEur) {
    throw new Error('Impossible de conserver la demande. Aucun retrait n’a été envoyé.');
  }
  return persisted;
}

export type WithdrawalConfirmation = {
  ok: true;
  user_id: string;
  idempotency_key: string;
  stripe_account_id: string;
  transfer_id: string;
  withdrawal_id: string;
  amount_eur: number;
  new_balance_eur: number;
  status: 'pending' | 'reversed';
  reversed_amount_eur: number;
};

export function readWithdrawalConfirmation(value: unknown, attempt: WithdrawalAttempt): WithdrawalConfirmation {
  if (!value || typeof value !== 'object') throw new Error('Le résultat de la demande reste à confirmer.');
  const receipt = value as Partial<WithdrawalConfirmation>;
  if (receipt.ok !== true || receipt.user_id !== attempt.userId || receipt.idempotency_key !== attempt.key ||
      receipt.stripe_account_id !== attempt.accountId || receipt.amount_eur !== attempt.amountEur ||
      typeof receipt.withdrawal_id !== 'string' || !UUID.test(receipt.withdrawal_id) ||
      typeof receipt.transfer_id !== 'string' || !/^tr_[A-Za-z0-9]+$/.test(receipt.transfer_id) ||
      typeof receipt.new_balance_eur !== 'number' || !Number.isFinite(receipt.new_balance_eur) || receipt.new_balance_eur < 0 ||
      !Number.isSafeInteger(Math.round(receipt.new_balance_eur * 100)) || Math.round(receipt.new_balance_eur * 100) / 100 !== receipt.new_balance_eur ||
      typeof receipt.reversed_amount_eur !== 'number' || !Number.isFinite(receipt.reversed_amount_eur) ||
      receipt.reversed_amount_eur < 0 || receipt.reversed_amount_eur > attempt.amountEur ||
      Math.round(receipt.reversed_amount_eur * 100) / 100 !== receipt.reversed_amount_eur ||
      !['pending','reversed'].includes(String(receipt.status)) ||
      (receipt.status === 'reversed') !== (receipt.reversed_amount_eur === attempt.amountEur)) {
    throw new Error('Le reçu ne correspond pas à cette demande. Son résultat reste à confirmer.');
  }
  return receipt as WithdrawalConfirmation;
}

export function clearConfirmedWithdrawal(storage: StoragePort, attempt: WithdrawalAttempt, receipt: WithdrawalConfirmation) {
  readWithdrawalConfirmation(receipt, attempt);
  const current = readWithdrawalAttempt(storage, attempt.userId, attempt.accountId);
  if (current?.key === attempt.key) storage.removeItem(storageKey(attempt.userId, attempt.accountId));
}

export function clearRejectedWithdrawal(storage: StoragePort, attempt: WithdrawalAttempt, value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Record<string, unknown>;
  if (receipt.request_closed !== true || receipt.rejection_recorded !== true ||
      receipt.debit_confirmed !== false || receipt.refunded !== false ||
      typeof receipt.withdrawal_id !== 'string' || !UUID.test(receipt.withdrawal_id) || receipt.user_id !== attempt.userId ||
      receipt.idempotency_key !== attempt.key || receipt.stripe_account_id !== attempt.accountId ||
      !['withdrawal_invalid_amount','withdrawal_cap_exceeded'].includes(String(receipt.code))) return false;
  const current = readWithdrawalAttempt(storage, attempt.userId, attempt.accountId);
  if (current?.key === attempt.key) storage.removeItem(storageKey(attempt.userId, attempt.accountId));
  return true;
}

// The existing IBAN wallet has a separate journal and receipt contract. Keep
// its requests distinct from Connect, without persisting the full bank account.
export type IbanWithdrawalAttempt = Readonly<{
  version: 1;
  userId: string;
  key: string;
  amountEur: number;
  ibanLast4: string;
  ibanDigest: string;
}>;
const ibanStorageKey = (userId: string) => 'midas:withdrawal:iban:v1:' + userId;
function walletMoney(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum &&
    Number.isSafeInteger(Math.round(value * 100)) && Math.round(value * 100) / 100 === value;
}

export function readIbanWithdrawalAttempt(storage: StoragePort, userId: string): IbanWithdrawalAttempt | null {
  if (!UUID.test(userId)) throw new Error('Identité de retrait invalide.');
  const raw = storage.getItem(ibanStorageKey(userId));
  if (raw === null) return null;
  const value = JSON.parse(raw) as Partial<IbanWithdrawalAttempt> | null;
  if (!value || value.version !== 1 || value.userId !== userId ||
      typeof value.key !== 'string' || !UUID.test(value.key) || !walletMoney(value.amountEur, 5) ||
      typeof value.ibanLast4 !== 'string' || !/^[A-Z0-9]{4}$/.test(value.ibanLast4) ||
      typeof value.ibanDigest !== 'string' || !/^[0-9a-f]{64}$/.test(value.ibanDigest)) {
    throw new Error('Le suivi du retrait nécessite une vérification. Aucune nouvelle demande n’a été envoyée.');
  }
  return Object.freeze(value as IbanWithdrawalAttempt);
}

export async function prepareIbanWithdrawalAttempt(
  storage: StoragePort, userId: string, amountEur: number, iban: string, newKey: () => string,
): Promise<IbanWithdrawalAttempt> {
  const pending = readIbanWithdrawalAttempt(storage, userId);
  const normalized = iban.replace(/\s/g, '').toUpperCase();
  if (pending && !normalized) return pending; // Read-only retry; cannot admit a new request.
  if (!walletMoney(amountEur, 5) || !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)) {
    throw new Error('Montant ou IBAN invalide.');
  }
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  const digest = Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
  // Recheck after the digest's await so another completed preparation wins.
  const current = readIbanWithdrawalAttempt(storage, userId);
  if (current) {
    if (current.amountEur !== amountEur || current.ibanDigest !== digest) {
      throw new Error('Cette demande conserve son montant et son IBAN d’origine.');
    }
    return current;
  }
  if (pending) throw new Error('Le suivi de la demande a changé. Recharge le wallet.');
  const key = newKey();
  if (!UUID.test(key)) throw new Error('Identifiant de demande invalide.');
  const value = Object.freeze({ version: 1 as const, userId, key, amountEur, ibanLast4: normalized.slice(-4), ibanDigest: digest });
  storage.setItem(ibanStorageKey(userId), JSON.stringify(value));
  const saved = readIbanWithdrawalAttempt(storage, userId);
  if (!saved || saved.key !== key || saved.amountEur !== amountEur || saved.ibanDigest !== digest) {
    throw new Error('Impossible de conserver la demande. Aucun retrait n’a été envoyé.');
  }
  return saved;
}

export type IbanWithdrawalConfirmation = {
  ok: true;
  withdrawal_id: string;
  user_id: string;
  idempotency_key: string;
  amount_eur: number;
  new_balance_eur: number;
  status: 'pending' | 'processed' | 'rejected';
  debit_confirmed: true;
  refunded: boolean;
  replayed: boolean;
  iban_last4: string;
};

export function readIbanWithdrawalConfirmation(value: unknown, attempt: IbanWithdrawalAttempt): IbanWithdrawalConfirmation {
  if (!value || typeof value !== 'object') throw new Error('Le résultat du retrait reste à confirmer.');
  const receipt = value as Partial<IbanWithdrawalConfirmation>;
  if (receipt.ok !== true || receipt.withdrawal_id !== attempt.key || receipt.idempotency_key !== attempt.key ||
      receipt.user_id !== attempt.userId || receipt.amount_eur !== attempt.amountEur ||
      receipt.iban_last4 !== attempt.ibanLast4 || !walletMoney(receipt.new_balance_eur) ||
      receipt.debit_confirmed !== true || typeof receipt.replayed !== 'boolean' ||
      !['pending', 'processed', 'rejected'].includes(String(receipt.status)) ||
      receipt.refunded !== (receipt.status === 'rejected')) {
    throw new Error('Le reçu ne correspond pas à cette demande. Son résultat reste à confirmer.');
  }
  return receipt as IbanWithdrawalConfirmation;
}

export function clearConfirmedIbanWithdrawal(storage: StoragePort, attempt: IbanWithdrawalAttempt, receipt: IbanWithdrawalConfirmation) {
  readIbanWithdrawalConfirmation(receipt, attempt);
  const current = readIbanWithdrawalAttempt(storage, attempt.userId);
  if (current?.key === attempt.key) storage.removeItem(ibanStorageKey(attempt.userId));
}

export function clearRejectedIbanWithdrawal(storage: StoragePort, attempt: IbanWithdrawalAttempt, value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Record<string, unknown>;
  if (receipt.request_closed !== true || receipt.rejection_recorded !== true || receipt.user_id !== attempt.userId ||
      receipt.withdrawal_id !== attempt.key || receipt.idempotency_key !== attempt.key ||
      receipt.debit_confirmed !== false || receipt.refunded !== false ||
      !['withdrawal_invalid_amount', 'insufficient_balance', 'withdrawal_pending', 'withdrawal_locked_30d'].includes(String(receipt.code))) return false;
  const current = readIbanWithdrawalAttempt(storage, attempt.userId);
  if (current?.key === attempt.key) storage.removeItem(ibanStorageKey(attempt.userId));
  return true;
}
