'use client';

import { motion } from 'framer-motion';
import { DollarSign, Target, TrendingUp, Link2 } from 'lucide-react';
import { usePerformance } from '@/hooks/usePerformance';
import { useExchange } from '@/hooks/useExchange';

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 22,
      delay: i * 0.08,
    },
  }),
};

export default function PortfolioOverview() {
  const perf = usePerformance();
  const { connected, balance } = useExchange();

  if (!connected) {
    return (
      <motion.div
        data-testid="portfolio-overview"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 }}
            className="w-12 h-12 rounded-xl bg-[#FFD700]/10 flex items-center justify-center mx-auto mb-4"
          >
            <Link2 className="w-6 h-6 text-[#FFD700]" />
          </motion.div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Connecte ton exchange
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-4 max-w-md mx-auto">
            Pour voir ton solde, tes positions et tes performances, connecte ton exchange dans les parametres.
          </p>
          <motion.a
            href="/dashboard/settings/exchanges"
            whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(255,215,0,0.2)' }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-sm font-semibold hover:bg-[#FFD700]/20 transition-colors"
          >
            Connecter un exchange
          </motion.a>
        </div>
      </motion.div>
    );
  }

  const stats = [
    {
      label: 'Balance',
      value: `$${balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'var(--gold-primary)',
      glow: 'rgba(255,215,0,0.15)',
    },
    {
      label: 'P&L Total',
      value: perf.totalPnl >= 0
        ? `+$${perf.totalPnl.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`
        : `-$${Math.abs(perf.totalPnl).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`,
      change: perf.totalTrades > 0 ? `${perf.totalPnl >= 0 ? '+' : ''}${((perf.totalPnl / Math.max(balance, 1)) * 100).toFixed(1)}%` : null,
      positive: perf.totalPnl >= 0,
      icon: TrendingUp,
      color: perf.totalPnl >= 0 ? '#10B981' : '#EF4444',
      glow: perf.totalPnl >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
    },
    {
      label: 'Win Rate',
      value: perf.totalTrades > 0 ? `${perf.winRate.toFixed(1)}%` : '0%',
      icon: Target,
      color: '#06B6D4',
      glow: 'rgba(6,182,212,0.12)',
    },
    {
      label: 'Trades',
      value: perf.totalTrades.toString(),
      icon: TrendingUp,
      color: 'var(--gold-primary)',
      glow: 'rgba(255,215,0,0.12)',
    },
  ];

  return (
    <div data-testid="portfolio-overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{
              y: -4,
              scale: 1.02,
              boxShadow: `0 8px 30px ${stat.glow}`,
              borderColor: `${stat.color}33`,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 cursor-default overflow-hidden"
            data-testid={`kpi-${stat.label.toLowerCase().replace(/[^a-z]/g, '-')}`}
          >
            {/* Subtle gradient bg */}
            <div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: `radial-gradient(circle at 80% 20%, ${stat.glow}, transparent 70%)` }}
            />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-tertiary)] font-medium">{stat.label}</span>
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </motion.div>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                {stat.value}
              </p>
              {'change' in stat && stat.change && (
                <span className={`text-xs font-medium ${stat.positive ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {stat.change}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
