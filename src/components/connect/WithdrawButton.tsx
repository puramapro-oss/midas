'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MIN_WITHDRAWAL_EUR, RECOMMENDED_WITHDRAWAL_EUR, FEES_GRID } from './withdrawConstants';
import { readWithdrawalAttempt, prepareWithdrawalAttempt, readWithdrawalConfirmation, clearConfirmedWithdrawal, clearRejectedWithdrawal, type WithdrawalAttempt, type WithdrawalConfirmation } from './withdrawal-attempt';

interface WithdrawButtonProps {
  userId: string;
  stripeAccountId: string;
  balanceEur: number;
  /** Appelé après succès avec le nouveau solde. */
  onSuccess?: (newBalanceEur: number) => void;
  /** Désactive complètement le bouton (ex: payouts_enabled=false). Optionnel. */
  disabled?: boolean;
  /** Libellé custom (défaut "Retirer mes gains"). */
  label?: string;
}

export default function WithdrawButton(props: WithdrawButtonProps) {
  // A changed account unmounts the previous controller and invalidates its
  // in-flight completion. Its persisted request remains scoped to its owner.
  return <WithdrawalControl key={`${props.userId}:${props.stripeAccountId}`} {...props} />;
}

function WithdrawalControl({ userId, stripeAccountId, balanceEur, onSuccess, disabled,
  label = 'Retirer mes gains' }: WithdrawButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<WithdrawalConfirmation | null>(null);
  const [pending, setPending] = useState<WithdrawalAttempt | null>(null);
  const [ready, setReady] = useState(false);
  const pendingRef = useRef<WithdrawalAttempt | null>(null);
  const busy = useRef(false);
  const active = useRef(true);
  const inputId = useId();
  const canWithdraw = ready && (pending !== null || (!disabled && balanceEur >= MIN_WITHDRAWAL_EUR));

  useEffect(() => {
    active.current = true;
    queueMicrotask(() => {
      if (!active.current) return;
      try {
        const saved = readWithdrawalAttempt(window.localStorage, userId, stripeAccountId);
        pendingRef.current = saved;
        setPending(saved);
        if (saved) setAmount(saved.amountEur.toFixed(2));
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Impossible de lire le suivi de retrait.');
      }
    });
    return () => { active.current = false; };
  }, [userId, stripeAccountId]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy.current) setModalOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const openModal = () => {
    if (!canWithdraw) return;
    setAmount((pendingRef.current?.amountEur ?? balanceEur).toFixed(2));
    setSuccess(null);
    setError(null);
    setModalOpen(true);
  };
  const closeModal = () => { if (!busy.current) setModalOpen(false); };

  const submit = async () => {
    if (busy.current || !ready || !active.current) return;
    setError(null);
    const parsed = Number(amount.replace(',', '.'));
    if (!pendingRef.current && (!Number.isFinite(parsed) || parsed < MIN_WITHDRAWAL_EUR ||
        parsed > balanceEur || Math.round(parsed * 100) / 100 !== parsed)) {
      setError('Choisis un montant disponible avec deux décimales maximum.');
      return;
    }
    busy.current = true;
    setSubmitting(true);
    try {
      const attempt = prepareWithdrawalAttempt(window.localStorage, userId, stripeAccountId, parsed, () => crypto.randomUUID());
      pendingRef.current = attempt;
      setPending(attempt);
      setAmount(attempt.amountEur.toFixed(2));
      const response = await fetch('/api/connect/withdraw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_eur: attempt.amountEur, idempotencyKey: attempt.key,
          expectedUserId: attempt.userId, expectedAccountId: attempt.accountId }),
      });
      const body: unknown = await response.json();
      if (!active.current) return;
      if (!response.ok) {
        if (clearRejectedWithdrawal(window.localStorage, attempt, body)) {
          pendingRef.current = null;
          setPending(null);
        }
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error : 'Le résultat de la demande reste à confirmer.';
        throw new Error(message);
      }
      const receipt = readWithdrawalConfirmation(body, attempt);
      // Clear only this account's verified request. Unknown responses and
      // transport failures keep the exact key and amount, including on reload.
      clearConfirmedWithdrawal(window.localStorage, attempt, receipt);
      pendingRef.current = null;
      setPending(null);
      setSuccess(receipt);
      onSuccess?.(receipt.new_balance_eur);
      window.dispatchEvent(new CustomEvent('purama:withdraw-success', {
        detail: { user_id: userId, amount_eur: receipt.amount_eur, transfer_id: receipt.transfer_id },
      }));
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : 'Le résultat de la demande reste à confirmer.');
    } finally {
      if (active.current) { busy.current = false; setSubmitting(false); }
    }
  };

  return (
    <>
      <button
        type="button"
        data-testid="withdraw-button"
        aria-label={label}
        onClick={openModal}
        disabled={!canWithdraw}
        className={
          'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition ' +
          (canWithdraw
            ? 'bg-[var(--gold-primary)] text-[var(--bg-primary)] hover:brightness-110'
            : 'cursor-not-allowed bg-white/10 text-[var(--text-tertiary)]')
        }
      >
        {pending ? 'Vérifier mon retrait en cours' : label}
      </button>
      {!ready && error ? <p role="alert" className="mt-2 text-sm text-red-300">{error}</p> : null}
      {!canWithdraw && balanceEur < MIN_WITHDRAWAL_EUR && (
        <p className="mt-2 text-xs text-[var(--text-tertiary)]" data-testid="withdraw-below-min">
          Solde minimum : {MIN_WITHDRAWAL_EUR}€. Il te manque {(MIN_WITHDRAWAL_EUR - balanceEur).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}.
        </p>
      )}
      {!canWithdraw && disabled && (
        <p className="mt-2 text-xs text-[var(--text-tertiary)]" data-testid="withdraw-disabled">
          Active d&apos;abord ton compte Stripe Connect.
        </p>
      )}
      {modalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${inputId}-title`}
          data-testid="withdraw-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <h3
              id={`${inputId}-title`}
              className="text-xl font-bold text-[var(--text-primary)]"
            >
              Retirer mes gains
            </h3>

            {success ? (
              <div data-testid="withdraw-success" className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                <p className="font-semibold">{success.status === 'reversed' ? 'Retrait annulé' : success.reversed_amount_eur > 0 ? 'Retrait partiellement annulé' : 'Transfert confirmé'}</p>
                <p className="mt-1">{success.reversed_amount_eur > 0
                  ? `${success.reversed_amount_eur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} recrédités sur ton wallet après confirmation de Stripe.`
                  : `${success.amount_eur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} transférés vers ton compte Stripe. Le versement bancaire dépend du calendrier de ce compte.`}</p>
                <button type="button" onClick={closeModal} className="mt-4 w-full rounded-lg bg-[var(--gold-primary)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] hover:brightness-110">Fermer</button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Solde disponible : <strong className="text-[var(--text-primary)]">{balanceEur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>
                </p>
                <div className="mt-5">
                  <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Montant à retirer</label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2">
                    <input id={inputId} data-testid="withdraw-amount-input" type="number" inputMode="decimal" min={MIN_WITHDRAWAL_EUR} max={balanceEur} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={submitting || pending !== null} className="flex-1 bg-transparent text-lg font-semibold text-[var(--text-primary)] outline-none" />
                    <span className="text-sm text-[var(--text-secondary)]">€</span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">Minimum {MIN_WITHDRAWAL_EUR}€. Recommandé : {RECOMMENDED_WITHDRAWAL_EUR}€+ pour réduire les frais Stripe.</p>
                </div>

                <div data-testid="withdraw-fees-grid" className="mt-5 rounded-lg border border-[var(--border-subtle)] p-3 text-xs">
                  <p className="mb-2 font-semibold text-[var(--text-primary)]">Frais Stripe (pas Purama)</p>
                  <div className="space-y-1">
                    {FEES_GRID.map((row) => (
                      <div key={row.amount} className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">{row.amount}€</span>
                        <span className={row.tone === 'danger' ? 'text-red-400' : row.tone === 'warn' ? 'text-amber-400' : 'text-emerald-400'}>
                          {row.feeEur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} ({row.pct})
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[var(--text-tertiary)]">Purama ne prend aucune commission sur tes gains.</p>
                </div>

                {pending && <p className="mt-4 text-sm text-[var(--text-secondary)]">Cette demande conserve le même montant. Sa vérification ne crée pas un second retrait.</p>}
                {error && <p role="alert" data-testid="withdraw-error" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

                <div className="mt-6 flex gap-3">
                  <button type="button" onClick={closeModal} disabled={submitting} className="flex-1 rounded-lg border border-[var(--border-default)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 disabled:opacity-50">Fermer</button>
                  <button type="button" data-testid="withdraw-confirm" onClick={submit} disabled={submitting} className="flex-1 rounded-lg bg-[var(--gold-primary)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] hover:brightness-110 disabled:opacity-50">{submitting ? 'Vérification…' : pending ? 'Vérifier cette demande' : 'Confirmer le retrait'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
