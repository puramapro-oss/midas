'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';

interface PoolBalance {
  id?: string;
  pool_type: string;
  balance: number;
  total_in: number;
  total_out: number;
}

interface PoolTransaction {
  id: string;
  pool_type: string;
  amount: number;
  direction: string;
  reason: string;
  source_name?: string;
  created_at: string;
}

interface FinancementData {
  pool_balances: PoolBalance[];
  pool_transactions: PoolTransaction[];
}

const POOL_LABELS: Record<string, { label: string; color: string }> = {
  reward: { label: 'Reward Pool (utilisateurs)', color: 'text-amber-400' },
  asso: { label: 'Association PURAMA', color: 'text-emerald-400' },
  partner: { label: 'Partenaires', color: 'text-blue-400' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

export default function AdminFinancementPage() {
  const [data, setData] = useState<FinancementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Form fields
  const [poolType, setPoolType] = useState<'reward' | 'asso' | 'partner'>('reward');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [sourceName, setSourceName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/financement');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    setSubmitting(true);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Le montant doit etre un nombre positif');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/financement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pool_type: poolType,
          amount: numAmount,
          reason,
          source_name: sourceName,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? 'Erreur lors de l\'ajout');
      } else {
        setFormSuccess(true);
        setAmount('');
        setReason('');
        setSourceName('');
        fetchData();
        setTimeout(() => {
          setShowForm(false);
          setFormSuccess(false);
        }, 1500);
      }
    } catch {
      setFormError('Erreur reseau');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  const poolBalances = data?.pool_balances ?? [];
  const poolTransactions = data?.pool_transactions ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] text-[#FFD700]">
          Financement
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg border border-white/10 hover:border-[#FFD700]/30 text-white/40 hover:text-[#FFD700] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/20 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Ajouter un financement
          </button>
        </div>
      </div>

      {/* Pool Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['reward', 'asso', 'partner'] as const).map((type, i) => {
          const pool = poolBalances.find(p => p.pool_type === type);
          const label = POOL_LABELS[type];
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <Wallet className={`w-5 h-5 ${label?.color ?? 'text-white/50'}`} />
                <span className="text-white/50 text-sm">{label?.label ?? type}</span>
              </div>
              <p className={`text-2xl font-bold font-[family-name:var(--font-jetbrains-mono)] ${label?.color ?? 'text-white'}`}>
                {formatCurrency(pool?.balance ?? 0)}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <ArrowDownLeft className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-white/40">
                    Entrees: {formatCurrency(pool?.total_in ?? 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-white/40">
                    Sorties: {formatCurrency(pool?.total_out ?? 0)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Funding Modal */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0A0F1A] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Landmark className="w-5 h-5 text-[#FFD700]" />
                <h2 className="text-lg font-bold font-[family-name:var(--font-orbitron)] text-white">
                  Ajouter un financement
                </h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-white/50 mb-1 block">Pool</label>
                <select
                  value={poolType}
                  onChange={(e) => setPoolType(e.target.value as 'reward' | 'asso' | 'partner')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]/30"
                >
                  <option value="reward">Reward Pool (utilisateurs)</option>
                  <option value="asso">Association PURAMA</option>
                  <option value="partner">Partenaires</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/50 mb-1 block">Montant (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]/30 font-[family-name:var(--font-jetbrains-mono)]"
                />
              </div>

              <div>
                <label className="text-sm text-white/50 mb-1 block">Source</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="Stripe CA, Aide SASU, Don asso..."
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]/30"
                />
              </div>

              <div>
                <label className="text-sm text-white/50 mb-1 block">Raison</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Depot CA mensuel, aide BPI..."
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]/30"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              {formSuccess && (
                <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
                  Financement ajoute avec succes
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#FFD700] to-amber-500 text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-semibold text-white/60 mb-3">
          Transactions recentes
        </h2>
        <div className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl overflow-hidden">
          {poolTransactions.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-sm">
              Aucune transaction enregistree
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Direction</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Pool</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Montant</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Raison</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Source</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {poolTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        {tx.direction === 'in' ? (
                          <ArrowDownLeft className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={POOL_LABELS[tx.pool_type]?.color ?? 'text-white/70'}>
                          {POOL_LABELS[tx.pool_type]?.label ?? tx.pool_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-[family-name:var(--font-jetbrains-mono)] text-xs ${tx.direction === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.direction === 'in' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/50 max-w-xs truncate">{tx.reason}</td>
                      <td className="px-4 py-3 text-white/40">{tx.source_name ?? '-'}</td>
                      <td className="px-4 py-3 text-white/40 font-[family-name:var(--font-jetbrains-mono)] text-xs">
                        {formatDate(tx.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
