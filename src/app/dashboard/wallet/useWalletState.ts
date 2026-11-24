'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { validateIban } from './utils';
import {
  readIbanWithdrawalAttempt, prepareIbanWithdrawalAttempt, readIbanWithdrawalConfirmation,
  clearConfirmedIbanWithdrawal, clearRejectedIbanWithdrawal, type IbanWithdrawalAttempt,
} from '@/components/connect/withdrawal-attempt';

interface Transaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

interface WalletData {
  user_id: string;
  balance: number;
  currency: string;
}

function validMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
    Number.isSafeInteger(Math.round(value * 100)) && Math.round(value * 100) / 100 === value;
}

function readWalletData(value: unknown, userId: string): { wallet: WalletData; transactions: Transaction[] } {
  if (!value || typeof value !== 'object') throw new Error('Lecture du wallet indisponible.');
  const data = value as Record<string, unknown>;
  const wallet = data.wallet as Partial<WalletData> | null;
  if (data.user_id !== userId || !wallet || wallet.user_id !== userId) {
    throw new Error('Le compte a changé. Recharge les informations du wallet.');
  }
  if (!validMoney(wallet.balance) || wallet.currency !== 'EUR' || !Array.isArray(data.transactions) ||
      !data.transactions.every((item: unknown) => {
        if (!item || typeof item !== 'object') return false;
        const row = item as Partial<Transaction>;
        return row.user_id === userId && typeof row.id === 'string' &&
          (row.type === 'credit' || row.type === 'debit') && validMoney(row.amount) &&
          typeof row.source === 'string' && (row.description === null || typeof row.description === 'string') &&
          typeof row.created_at === 'string' && Number.isFinite(Date.parse(row.created_at));
      })) throw new Error('Le solde ou l’historique reçu ne peut pas être confirmé.');
  return { wallet: wallet as WalletData, transactions: data.transactions as Transaction[] };
}

export function useWalletState(userId: string, withdrawalAvailable: boolean) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [iban, setIban] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [pending, setPending] = useState<IbanWithdrawalAttempt | null>(null);
  const pendingRef = useRef<IbanWithdrawalAttempt | null>(null);
  const active = useRef(true);
  const busy = useRef(false);
  const readVersion = useRef(0);
  const balance = wallet?.balance ?? 0;

  const fetchWallet = useCallback(async () => {
    const version = ++readVersion.current;
    try {
      const res = await fetch('/api/wallet', { cache: 'no-store' });
      if (!res.ok) throw new Error('Lecture du wallet indisponible.');
      const data: unknown = await res.json();
      if (!active.current || version !== readVersion.current) return;
      const snapshot = readWalletData(data, userId);
      setWallet(snapshot.wallet);
      setTransactions(snapshot.transactions);
      setLoadError(null);
    } catch (error) {
      if (!active.current || version !== readVersion.current) return;
      setWallet(null);
      setTransactions([]);
      setLoadError(error instanceof Error ? error.message : 'Lecture du wallet indisponible.');
    } finally {
      if (active.current && version === readVersion.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let current = true;
    active.current = true;
    queueMicrotask(() => {
      if (!current) return;
      try {
        const saved = readIbanWithdrawalAttempt(window.localStorage, userId);
        pendingRef.current = saved;
        setPending(saved);
        if (saved) setAmount(saved.amountEur.toFixed(2));
        setStorageReady(true);
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : 'Le suivi du retrait est indisponible.');
      }
      void fetchWallet();
    });
    return () => { current = false; active.current = false; };
  }, [fetchWallet, userId]);

  useEffect(() => {
    if (!showWithdraw) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy.current) setShowWithdraw(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [showWithdraw]);

  const handleWithdraw = async () => {
    if (busy.current || !active.current || !storageReady || !withdrawalAvailable) return;
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    const prior = pendingRef.current;
    if ((cleanIban || !prior) && !validateIban(cleanIban)) {
      toast.error('IBAN invalide');
      return;
    }
    const amt = prior?.amountEur ?? Number(amount.replace(',', '.'));
    if (!validMoney(amt) || amt < 5) {
      toast.error('Montant minimum : 5€');
      return;
    }
    if (!prior && (!wallet || amt > wallet.balance)) {
      toast.error('Solde insuffisant');
      return;
    }

    busy.current = true;
    setWithdrawing(true);
    setRequestError(null);
    try {
      const attempt = await prepareIbanWithdrawalAttempt(window.localStorage, userId, amt, cleanIban, () => crypto.randomUUID());
      if (!active.current) return;
      pendingRef.current = attempt;
      setPending(attempt);
      setAmount(attempt.amountEur.toFixed(2));
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: attempt.key, expectedUserId: attempt.userId,
          ...(cleanIban ? { amount: attempt.amountEur, iban: cleanIban } : {}) }),
      });
      const data: unknown = await res.json();
      if (!active.current) return;
      if (!res.ok) {
        if (clearRejectedIbanWithdrawal(window.localStorage, attempt, data)) {
          const remaining = readIbanWithdrawalAttempt(window.localStorage, userId);
          pendingRef.current = remaining;
          setPending(remaining);
        }
        const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error : 'Le résultat de la demande reste à confirmer.';
        throw new Error(message);
      }
      const receipt = readIbanWithdrawalConfirmation(data, attempt);
      clearConfirmedIbanWithdrawal(window.localStorage, attempt, receipt);
      const remaining = readIbanWithdrawalAttempt(window.localStorage, userId);
      pendingRef.current = remaining;
      setPending(remaining);
      readVersion.current++; // A pre-debit GET must not replace the confirmed balance.
      setWallet({ user_id: userId, balance: receipt.new_balance_eur, currency: 'EUR' });
      toast.success(receipt.status === 'rejected' ? 'Demande rejetée et solde recrédité.' : receipt.status === 'processed' ? 'Demande de retrait marquée traitée.' : 'Demande de retrait enregistrée.');
      setShowWithdraw(false);
      setIban('');
      setAmount(remaining?.amountEur.toFixed(2) ?? '');
      void fetchWallet();
    } catch (error) {
      if (active.current) {
        const message = error instanceof Error ? error.message : 'Le résultat de la demande reste à confirmer.';
        setRequestError(message);
        toast.error(message);
      }
    } finally {
      if (active.current) { busy.current = false; setWithdrawing(false); }
    }
  };

  return {
    wallet, transactions, loading, showWithdraw, iban, setIban, amount, setAmount,
    withdrawing, loadError, requestError, storageReady, pending, balance,
    fetchWallet, handleWithdraw,
    openWithdraw: () => { if (!busy.current) setShowWithdraw(true); },
    closeWithdraw: () => { if (!busy.current) setShowWithdraw(false); },
  };
}
