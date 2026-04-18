'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, ArrowUpRight, ArrowDownRight, Clock,
  CreditCard, X, Check, AlertTriangle, Loader2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import PrimeTracker from '@/components/wallet/PrimeTracker';
import CardTeaser from '@/components/wallet/CardTeaser';
import FiscalBanner from '@/components/fiscal/FiscalBanner';
import { usePhase } from '@/hooks/usePhase';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  source: string;
  description: string;
  created_at: string;
}

interface WalletData {
  balance: number;
  currency: string;
}

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Parrainage',
  contest: 'Concours',
  withdrawal: 'Retrait',
  manual: 'Manuel',
};

function validateIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean);
}

const rowFade = {
  hidden: { opacity: 0, x: -10 } as const,
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24, delay: i * 0.04 },
  }),
};

export default function WalletPage() {
  const phase = usePhase();
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, currency: 'EUR' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [iban, setIban] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet');
      if (!res.ok) return;
      const data = await res.json();
      setWallet(data.wallet ?? { balance: 0, currency: 'EUR' });
      setTransactions(data.transactions ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleWithdraw = async () => {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (!validateIban(cleanIban)) {
      toast.error('IBAN invalide');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5) {
      toast.error('Montant minimum : 5€');
      return;
    }
    if (amt > wallet.balance) {
      toast.error('Solde insuffisant');
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, iban: cleanIban }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Erreur lors du retrait');
        return;
      }
      toast.success('Demande de retrait envoyée !');
      setShowWithdraw(false);
      setIban('');
      setAmount('');
      fetchWallet();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="wallet-page">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">Wallet</h1>
          <p className="text-sm text-white/40 mt-1">Tes gains parrainage et concours.</p>
        </div>
        <div className="rounded-2xl border border-[#FFD700]/20 bg-gradient-to-br from-[#FFD700]/[0.06] to-transparent backdrop-blur-sm p-6 animate-pulse">
          <div className="h-6 w-24 bg-white/10 rounded mb-4" />
          <div className="h-10 w-32 bg-white/10 rounded mb-4" />
          <div className="h-10 w-40 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

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
        <p className="text-4xl font-bold text-[#FFD700] mb-4" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
          {wallet.balance.toFixed(2)}€
        </p>
        <button
          type="button"
          onClick={() => setShowWithdraw(true)}
          disabled={wallet.balance < 5 || !phase.withdrawalAvailable}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD700] text-[#06080F] text-sm font-semibold hover:bg-[#FFD700]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="withdraw-button"
        >
          <CreditCard className="w-4 h-4" />
          {phase.withdrawalAvailable ? 'Retirer vers mon compte' : 'Retrait — Bientôt disponible'}
        </button>
        {!phase.withdrawalAvailable && (
          <p className="text-xs text-white/40 mt-2">
            Le retrait IBAN s&apos;activera avec la <span className="text-[#FFD700]">Purama Card</span>. Tes gains restent dans ton wallet en attendant.
          </p>
        )}
        {phase.withdrawalAvailable && wallet.balance < 5 && (
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
            onClick={() => setShowWithdraw(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-gold rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white font-[family-name:var(--font-orbitron)]">Retrait</h3>
                <button type="button" onClick={() => setShowWithdraw(false)} className="p-1 text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Montant (minimum 5€)</label>
                  <input
                    type="number"
                    min="5"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Max ${wallet.balance.toFixed(2)}€`}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-[#FFD700]/40"
                    data-testid="withdraw-amount"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">IBAN (FR/EU)</label>
                  <input
                    type="text"
                    value={iban}
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

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdraw(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.04] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={withdrawing || !iban || !amount}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFD700] text-[#06080F] text-sm font-semibold hover:bg-[#FFD700]/90 transition-colors disabled:opacity-40"
                    data-testid="confirm-withdraw"
                  >
                    {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Retirer
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
                  {tx.type === 'credit' ? '+' : '-'}{Number(tx.amount).toFixed(2)}€
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
