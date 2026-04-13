'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  CreditCard,
  Leaf,
  Zap,
  Lock,
  Heart,
  Target,
  Flame,
  TrendingUp,
  ChevronRight,
  Loader2,
  Shield,
} from 'lucide-react';

interface SubWallet {
  type: string;
  balance: number;
  label: string;
  description: string;
  split_pct: number;
  color: string;
}

interface Engine {
  id: string;
  name: string;
  description: string;
  active: boolean;
  type: string;
  lifetime_earnings: number;
}

interface WealthData {
  total_balance: number;
  sub_wallets: SubWallet[];
  card: { active: boolean; nature_score: number; total_cashback: number; monthly_cashback: number };
  engines: Engine[];
  active_engines_count: number;
  total_lifetime_earnings: number;
  nature_score: number;
  revenue_split: { users: number; growth: number; sasu: number };
}

const walletIcons: Record<string, React.ReactNode> = {
  principal: <Wallet className="h-4 w-4" />,
  boost: <Zap className="h-4 w-4" />,
  emergency: <Shield className="h-4 w-4" />,
  dream: <Target className="h-4 w-4" />,
  pending: <Lock className="h-4 w-4" />,
  solidaire: <Heart className="h-4 w-4" />,
};

export default function WealthPage() {
  const [data, setData] = useState<WealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/wealth')
      .then((r) => r.json())
      .then((d) => setData(d.wealth ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-32 text-white/30">Erreur chargement Wealth Engine</div>;
  }

  return (
    <div className="space-y-6" data-testid="wealth-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          Wealth Engine
        </h1>
        <p className="text-sm text-white/40 mt-1">
          {data.active_engines_count} moteurs actifs — {data.total_lifetime_earnings} EUR gagnes
        </p>
      </div>

      {/* Total balance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#F59E0B]/10 to-[#7C3AED]/10 border border-[#F59E0B]/20 rounded-2xl p-6"
      >
        <p className="text-sm text-white/50">Solde total</p>
        <p className="text-4xl font-bold text-white font-mono mt-1">
          {data.total_balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span>{data.revenue_split.users}% redistribue aux users</span>
          </div>
        </div>
      </motion.div>

      {/* 6 Sub-wallets */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 mb-3">Smart Split — 6 wallets</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {data.sub_wallets.map((w, i) => (
            <motion.div
              key={w.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: w.color + '20', color: w.color }}
                >
                  {walletIcons[w.type] ?? <Wallet className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{w.label}</p>
                  <p className="text-[10px] text-white/30">{w.split_pct}%</p>
                </div>
              </div>
              <p className="text-lg font-bold font-mono text-white">
                {w.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-white/25 mt-1">{w.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Purama Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#7C3AED] flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Purama Card</h3>
              <p className="text-xs text-white/40">
                {data.card.active ? 'Active' : 'Bientot disponible'} — Powered by Treezor
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-white/20" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-white/40">Nature Score</p>
            <p className="text-lg font-bold text-emerald-400">{data.card.nature_score}/100</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Cashback total</p>
            <p className="text-lg font-bold text-[#F59E0B]">{data.card.total_cashback} EUR</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Ce mois</p>
            <p className="text-lg font-bold text-white">{data.card.monthly_cashback} EUR</p>
          </div>
        </div>

        {/* Purity tiers visual */}
        <div className="flex gap-1 mt-4">
          {['#60A5FA', '#F59E0B', '#9CA3AF', '#CD7F32', '#6B7280', '#374151', '#111827'].map((c, i) => (
            <div
              key={i}
              className="flex-1 h-2 rounded-full"
              style={{ backgroundColor: c, opacity: i <= 3 ? 1 : 0.3 }}
            />
          ))}
        </div>
        <p className="text-[10px] text-white/20 mt-1">7 niveaux cashback — Diamant 20% → Noir 0%</p>
      </motion.div>

      {/* Nature Rewards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Leaf className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Nature Rewards</h3>
            <p className="text-xs text-white/40">Gagne jusqu&apos;a 10 EUR/jour en vivant sainement</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: '10K pas', amount: '0.75 EUR' },
            { label: '1h sport', amount: '1.50 EUR' },
            { label: 'Meditation', amount: '0.30 EUR' },
            { label: 'Sommeil 7-8h', amount: '0.20 EUR' },
            { label: 'Cuisine maison', amount: '0.20 EUR' },
            { label: 'Velo', amount: '0.50 EUR' },
            { label: 'Ramassage dechets', amount: '2.00 EUR' },
            { label: 'Gratitude', amount: '0.20 EUR' },
          ].map((r) => (
            <div key={r.label} className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-white/60">{r.label}</p>
              <p className="text-sm font-bold text-emerald-400 font-mono">{r.amount}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Revenue Engines */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 mb-3">
          20 moteurs de revenus ({data.active_engines_count} actifs)
        </h2>
        <div className="space-y-2">
          {data.engines.filter((e) => e.active).map((engine, i) => (
            <motion.div
              key={engine.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">{engine.name}</p>
                  <p className="text-xs text-white/30">{engine.description}</p>
                </div>
              </div>
              <p className="text-sm font-bold font-mono text-[#F59E0B]">
                {engine.lifetime_earnings > 0 ? `${engine.lifetime_earnings} EUR` : '—'}
              </p>
            </motion.div>
          ))}

          {/* Inactive engines teaser */}
          <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.06]">
            <p className="text-xs text-white/20">
              +{data.engines.filter((e) => !e.active).length} moteurs bientot disponibles (B2B, Jobs, Clone IA, Bridges...)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
