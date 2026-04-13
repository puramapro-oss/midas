'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Flame,
  Sparkles,
  Share2,
  BarChart3,
  Star,
  Award,
} from 'lucide-react';

interface WrappedData {
  month: string;
  total_trades: number;
  closed_trades: number;
  total_pnl: number;
  wins: number;
  losses: number;
  win_rate: number;
  best_trade: { pair: string; pnl: number; strategy: string } | null;
  favorite_pair: string;
  favorite_strategy: string;
  streak: number;
  xp: number;
  level: number;
  purama_points: number;
  achievements_unlocked: number;
}

export default function WrappedPage() {
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/wrapped')
      .then((r) => r.json())
      .then((d) => setData(d.wrapped ?? null))
      .finally(() => setLoading(false));
  }, []);

  const handleShare = () => {
    const url = `/api/story?type=gains&value=${data?.total_pnl ?? 0}&username=trader`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-32 text-white/30">
        Pas encore de donnees pour ce mois.
      </div>
    );
  }

  const stats = [
    { icon: BarChart3, label: 'Trades executes', value: data.total_trades, color: 'text-blue-400' },
    { icon: Target, label: 'Win rate', value: `${data.win_rate}%`, color: data.win_rate >= 50 ? 'text-emerald-400' : 'text-red-400' },
    { icon: data.total_pnl >= 0 ? TrendingUp : TrendingDown, label: 'P&L total', value: `${data.total_pnl >= 0 ? '+' : ''}${data.total_pnl} USDT`, color: data.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { icon: Flame, label: 'Streak', value: `${data.streak} jours`, color: 'text-orange-400' },
    { icon: Star, label: 'XP gagne', value: data.xp, color: 'text-amber-400' },
    { icon: Award, label: 'Achievements', value: data.achievements_unlocked, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6" data-testid="wrapped-page">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-medium mb-4">
          <Sparkles className="h-3 w-3" />
          Wrapped Mensuel
        </div>
        <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          {data.month}
        </h1>
        <p className="text-sm text-white/40 mt-2">
          Ton recap de trading ce mois
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
          >
            <stat.icon className={`h-5 w-5 ${stat.color} mb-3`} />
            <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-white/40 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Best trade */}
      {data.best_trade && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-[#F59E0B]/10 to-[#7C3AED]/10 border border-[#F59E0B]/20 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-[#F59E0B]" />
            <h3 className="text-sm font-semibold text-white">Meilleur trade du mois</h3>
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            +{data.best_trade.pnl} USDT
          </p>
          <p className="text-xs text-white/40 mt-1">
            {data.best_trade.pair} — {data.best_trade.strategy}
          </p>
        </motion.div>
      )}

      {/* Favorites */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-white/40 mb-2">Paire favorite</p>
          <p className="text-lg font-bold text-white font-mono">{data.favorite_pair}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-white/40 mb-2">Strategie favorite</p>
          <p className="text-lg font-bold text-white">{data.favorite_strategy}</p>
        </div>
      </motion.div>

      {/* Share button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={handleShare}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#7C3AED] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        <Share2 className="h-4 w-4" /> Partager mon Wrapped
      </motion.button>
    </div>
  );
}
