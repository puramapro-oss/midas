'use client';

import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

interface PoolBalance {
  id?: string;
  pool_type: string;
  balance: number;
  total_in: number;
  total_out: number;
}

interface PoolBalanceCardProps {
  type: 'reward' | 'asso' | 'partner';
  pool: PoolBalance | undefined;
  index: number;
  formatCurrency: (amount: number) => string;
}

const POOL_LABELS: Record<string, { label: string; color: string }> = {
  reward: { label: 'Reward Pool (utilisateurs)', color: 'text-amber-400' },
  asso: { label: 'Association PURAMA', color: 'text-emerald-400' },
  partner: { label: 'Partenaires', color: 'text-blue-400' },
};

export default function PoolBalanceCard({ type, pool, index, formatCurrency }: PoolBalanceCardProps) {
  const label = POOL_LABELS[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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
}
