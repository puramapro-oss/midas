'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Loader2, Plus, RefreshCw } from 'lucide-react';
import PoolBalanceCard from '@/components/admin/PoolBalanceCard';
import AddFundingModal from '@/components/admin/AddFundingModal';

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
    queueMicrotask(() => fetchData());
  }, [fetchData]);

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
        {(['reward', 'asso', 'partner'] as const).map((type, i) => (
          <PoolBalanceCard
            key={type}
            type={type}
            pool={poolBalances.find(p => p.pool_type === type)}
            index={i}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>

      {/* Add Funding Modal */}
      {showForm && (
        <AddFundingModal
          onClose={() => setShowForm(false)}
          onSuccess={fetchData}
        />
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
