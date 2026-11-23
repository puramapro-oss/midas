'use client';

import { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, ArrowUpRight, ArrowDownRight, Clock,
  CreditCard, X, Check, AlertTriangle, Loader2, RefreshCw,
} from 'lucide-react';
import PrimeTracker from '@/components/wallet/PrimeTracker';
import CardTeaser from '@/components/wallet/CardTeaser';
import FiscalBanner from '@/components/fiscal/FiscalBanner';
import { usePhase } from '@/hooks/usePhase';
import { formatWalletAmount } from '@/lib/utils/formatters';
import { SOURCE_LABELS, validateIban, rowFade } from './utils';
import { useWalletState } from './useWalletState';
import { useAuth } from '@/hooks/useAuth';

export default function WalletPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" /></div>;
  if (!user) return <p role="alert" data-testid="wallet-error" className="p-8 text-white/60">Connecte-toi pour consulter ton wallet.</p>;
  return <WalletController key={user.id} userId={user.id} />;
}

function WalletController({ userId }: { userId: string }) {
  const phase = usePhase();
  const titleId = useId();
  const {
    wallet, transactions, loading, showWithdraw, iban, setIban, amount, setAmount,
    withdrawing, loadError, requestError, storageReady, pending, balance,
    fetchWallet, handleWithdraw, openWithdraw, closeWithdraw,
  } = useWalletState(userId, phase.withdrawalAvailable);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" /></div>;

  return (
    <div className="space-y-6" data-testid="wallet-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">Wallet</h1>
          <p className="text-sm text-white/40 mt-1">Tes gains parrainage et concours.</p>
        </div>
        <button
          type="button"
          onClick={fetchWallet}
          className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
          aria-label="Rafraîchir"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loadError && <p role="alert" data-testid="wallet-error" className="text-sm text-red-300">{loadError}</p>}
      {requestError && <p role="alert" data-testid="wallet-withdraw-error" className="text-sm text-red-300">{requestError}</p>}

      <FiscalBanner />

      <PrimeTracker />

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="rounded-2xl border border-[#FFD700]/20 bg-gradient-to-br from-[#FFD700]/[0.06] to-transparent backdrop-blur-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFD700]/15">
              <Wallet className="w-5 h-5 text-[#FFD700]" />
            </div>
            <span className="text-sm text-white/50">Solde disponible</span>
          </div>
          <span className="text-[10px] text-white/30 px-2 py-0.5 rounded-full border border-white/[0.08]">
            {phase.walletMode === 'points' ? 'POINTS' : 'EUR'}
          </span>
        </div>
        <p data-testid="wallet-balance" className="text-4xl font-bold text-[#FFD700] mb-4" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
          {wallet ? formatWalletAmount(wallet.balance, phase.walletMode) : '—'}
        </p>
        <button
          type="button"
          onClick={openWithdraw}
          disabled={!storageReady || !phase.withdrawalAvailable || (!pending && (!wallet || balance < 5))}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD700] text-[#06080F] text-sm font-semibold hover:bg-[#FFD700]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="withdraw-button"
        >
          <CreditCard className="w-4 h-4" />
          {phase.withdrawalAvailable ? pending ? 'Vérifier ma demande en cours' : 'Retirer vers mon compte' : 'Retrait — Bientôt disponible'}
        </button>
        {!phase.withdrawalAvailable && (
          <p className="text-xs text-white/40 mt-2">
            Le retrait IBAN s&apos;activera avec la <span className="text-[#FFD700]">Purama Card</span>. Tes gains restent dans ton wallet en attendant.
          </p>
        )}
        {phase.withdrawalAvailable && wallet && !pending && balance < 5 && (
          <p className="text-xs text-white/30 mt-2">Minimum de retrait : 5€</p>
        )}
      </motion.div>

      {/* Withdrawal modal */}
      <AnimatePresence>
        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeWithdraw}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-gold rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 id={titleId} className="text-lg font-semibold text-white font-[family-name:var(--font-orbitron)]">Retrait</h3>
                <button type="button" aria-label="Fermer le retrait" disabled={withdrawing} onClick={closeWithdraw} className="p-1 text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor={`${titleId}-amount`} className="block text-xs text-white/40 mb-1.5">Montant (minimum 5€)</label>
                  <input
                    id={`${titleId}-amount`}
                    type="number"
                    min="5"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={withdrawing || pending !== null}
                    placeholder={wallet ? `Max ${wallet.balance.toFixed(2)}€` : 'Solde indisponible'}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-[#FFD700]/40"
                    data-testid="withdraw-amount"
                  />
                </div>
                <div>
                  <label htmlFor={`${titleId}-iban`} className="block text-xs text-white/40 mb-1.5">IBAN (FR/EU)</label>
                  <input
                    id={`${titleId}-iban`}
                    type="text"
                    value={iban}
                    disabled={withdrawing}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-[#FFD700]/40 font-mono"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                    data-testid="withdraw-iban"
                  />
                  {iban && !validateIban(iban.replace(/\s/g, '').toUpperCase()) && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> IBAN invalide
                    </p>
                  )}
                </div>

                {pending && <p className="text-xs text-white/60">La même demande de {pending.amountEur.toFixed(2)}€ vers l’IBAN se terminant par {pending.ibanLast4} est conservée. Tu peux vérifier son résultat sans ressaisir l’IBAN. Si elle n’est pas encore enregistrée, ressaisis l’IBAN d’origine pour reprendre cette même demande.</p>}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={withdrawing}
                    onClick={closeWithdraw}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.04] transition-colors"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={withdrawing || !storageReady || (!pending && (!iban || !amount))}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFD700] text-[#06080F] text-sm font-semibold hover:bg-[#FFD700]/90 transition-colors disabled:opacity-40"
                    data-testid="confirm-withdraw"
                  >
                    {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {pending ? 'Vérifier cette demande' : 'Retirer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4 font-[family-name:var(--font-orbitron)]">
          Historique
        </h3>

        {transactions.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Aucune transaction</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                custom={i}
                variants={rowFade}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {tx.type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{tx.description ?? 'Transaction'}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {SOURCE_LABELS[tx.source] ?? tx.source} — {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold shrink-0 ml-3 ${
                  tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                }`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {tx.type === 'credit' ? '+' : '-'}{formatWalletAmount(Number(tx.amount), phase.walletMode)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <CardTeaser />
    </div>
  );
}
