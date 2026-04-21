'use client';

// =============================================================================
// MIDAS — WithdrawButton (V4.1 Axe 3)
//
// Composant client qui gère le retrait wallet → Stripe Connect.
//
// - Disabled si balance < MIN_WITHDRAWAL_EUR (20€) ou canWithdraw=false
// - Modal confirmation avec grille frais Stripe + input montant éditable
// - Submit → POST /api/connect/withdraw
// - Success → confettis (via window event 'purama:withdraw-success') + onSuccess(newBalance)
// - Échec → message erreur FR + reset
//
// Accessibilité : aria-label, focus trap basique dans modal, ESC ferme.
// =============================================================================

import { useCallback, useEffect, useId, useState } from 'react';

const MIN_WITHDRAWAL_EUR = 20;
const RECOMMENDED_WITHDRAWAL_EUR = 50;

/** Grille frais Stripe Connect (brief STRIPE_CONNECT_KARMA_V4.md §Grille). */
const FEES_GRID: Array<{ amount: number; feeEur: number; pct: string; tone: 'danger' | 'warn' | 'ok' }> = [
  { amount: 20, feeEur: 2.30, pct: '11,5%', tone: 'danger' },
  { amount: 30, feeEur: 2.33, pct: '7,8%', tone: 'warn' },
  { amount: 50, feeEur: 2.38, pct: '4,8%', tone: 'ok' },
  { amount: 100, feeEur: 2.50, pct: '2,5%', tone: 'ok' },
];

interface WithdrawButtonProps {
  balanceEur: number;
  /** Appelé après succès avec le nouveau solde. */
  onSuccess?: (newBalanceEur: number) => void;
  /** Désactive complètement le bouton (ex: payouts_enabled=false). Optionnel. */
  disabled?: boolean;
  /** Libellé custom (défaut "Retirer mes gains"). */
  label?: string;
}

interface WithdrawResponse {
  ok: boolean;
  transfer_id?: string;
  amount_eur?: number;
  new_balance_eur?: number;
  status?: string;
  error?: string;
  code?: string;
}

export default function WithdrawButton({
  balanceEur,
  onSuccess,
  disabled,
  label = 'Retirer mes gains',
}: WithdrawButtonProps) {
  const canWithdraw = !disabled && balanceEur >= MIN_WITHDRAWAL_EUR;

  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<WithdrawResponse | null>(null);

  const inputId = useId();

  // Initialise le montant par défaut = solde complet quand la modal s'ouvre
  useEffect(() => {
    if (modalOpen) {
      setAmount(balanceEur.toFixed(2));
      setError(null);
      setSuccess(null);
    }
  }, [modalOpen, balanceEur]);

  // ESC ferme la modal
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, submitting]);

  const openModal = useCallback(() => {
    if (!canWithdraw) return;
    setModalOpen(true);
  }, [canWithdraw]);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setModalOpen(false);
  }, [submitting]);

  const submit = useCallback(async () => {
    setError(null);
    const parsed = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Montant invalide');
      return;
    }
    if (parsed < MIN_WITHDRAWAL_EUR) {
      setError(`Montant minimum ${MIN_WITHDRAWAL_EUR}€.`);
      return;
    }
    if (parsed > balanceEur) {
      setError('Tu ne peux pas retirer plus que ton solde.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/connect/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_eur: parsed }),
      });
      const body = (await res.json().catch(() => ({}))) as WithdrawResponse;

      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Erreur lors du retrait. Réessaie.');
        setSubmitting(false);
        return;
      }

      setSuccess(body);
      if (typeof body.new_balance_eur === 'number') {
        onSuccess?.(body.new_balance_eur);
      }

      // Event global pour que le wallet/dashboard puisse écouter + lancer
      // confettis / toast / reload sans coupling avec ce composant.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('purama:withdraw-success', {
            detail: {
              amount_eur: body.amount_eur,
              transfer_id: body.transfer_id,
            },
          }),
        );
      }
      setSubmitting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
      setSubmitting(false);
    }
  }, [amount, balanceEur, onSuccess]);

  // ---- Button -------------------------------------------------------------

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
        {label}
      </button>
      {!canWithdraw && balanceEur < MIN_WITHDRAWAL_EUR ? (
        <p
          className="mt-2 text-xs text-[var(--text-tertiary)]"
          data-testid="withdraw-below-min"
        >
          Solde minimum pour retirer : {MIN_WITHDRAWAL_EUR}€. Il te manque{' '}
          {(MIN_WITHDRAWAL_EUR - balanceEur).toLocaleString('fr-FR', {
            style: 'currency',
            currency: 'EUR',
          })}
          .
        </p>
      ) : null}
      {!canWithdraw && disabled ? (
        <p
          className="mt-2 text-xs text-[var(--text-tertiary)]"
          data-testid="withdraw-disabled"
        >
          Active d&apos;abord ton compte Stripe Connect.
        </p>
      ) : null}

      {/* ---- Modal ---- */}
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
              <div
                data-testid="withdraw-success"
                className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
              >
                <p className="font-semibold">Retrait lancé ✨</p>
                <p className="mt-1">
                  {(success.amount_eur ?? 0).toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  })}{' '}
                  transférés vers ton compte Stripe. Arrivée sous 1 à 3 jours
                  ouvrés.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-4 w-full rounded-lg bg-[var(--gold-primary)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] hover:brightness-110"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Solde disponible :{' '}
                  <strong className="text-[var(--text-primary)]">
                    {balanceEur.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </strong>
                </p>

                <div className="mt-5">
                  <label
                    htmlFor={inputId}
                    className="block text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]"
                  >
                    Montant à retirer
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2">
                    <input
                      id={inputId}
                      data-testid="withdraw-amount-input"
                      type="number"
                      inputMode="decimal"
                      min={MIN_WITHDRAWAL_EUR}
                      max={balanceEur}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={submitting}
                      className="flex-1 bg-transparent text-lg font-semibold text-[var(--text-primary)] outline-none"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">€</span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    Minimum {MIN_WITHDRAWAL_EUR}€. Recommandé :{' '}
                    {RECOMMENDED_WITHDRAWAL_EUR}€+ pour réduire les frais
                    Stripe.
                  </p>
                </div>

                <div
                  data-testid="withdraw-fees-grid"
                  className="mt-5 rounded-lg border border-[var(--border-subtle)] p-3 text-xs"
                >
                  <p className="mb-2 font-semibold text-[var(--text-primary)]">
                    Frais Stripe (pas Purama)
                  </p>
                  <div className="space-y-1">
                    {FEES_GRID.map((row) => (
                      <div
                        key={row.amount}
                        className="flex items-center justify-between"
                      >
                        <span className="text-[var(--text-secondary)]">
                          {row.amount}€
                        </span>
                        <span
                          className={
                            row.tone === 'danger'
                              ? 'text-red-400'
                              : row.tone === 'warn'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }
                        >
                          {row.feeEur.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}{' '}
                          ({row.pct})
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[var(--text-tertiary)]">
                    Purama ne prend aucune commission sur tes gains.
                  </p>
                </div>

                {error ? (
                  <p
                    data-testid="withdraw-error"
                    className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="flex-1 rounded-lg border border-[var(--border-default)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    data-testid="withdraw-confirm"
                    onClick={submit}
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-[var(--gold-primary)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] hover:brightness-110 disabled:opacity-50"
                  >
                    {submitting ? 'Envoi…' : 'Confirmer le retrait'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
