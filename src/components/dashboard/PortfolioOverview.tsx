'use client';

import { motion } from 'framer-motion';
import { DollarSign, Target, TrendingUp } from 'lucide-react';
import { usePerformance } from '@/hooks/usePerformance';

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
  if (perf.loading) return <p role="status">Chargement des performances simulées…</p>;
  if (perf.error) return <div role="alert" className="text-red-400">
    <p>{perf.error}</p><button onClick={() => void perf.refresh()} className="underline">Réessayer</button>
  </div>;

  const stats = [
    {
      label: 'Frais simulés',
      value: `${perf.totalFees.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USDT`,
      icon: DollarSign,
      color: 'var(--gold-primary)',
      glow: 'rgba(255,215,0,0.15)',
    },
    {
      label: 'P&L simulé net',
      value: perf.totalPnl >= 0
        ? `+${perf.totalPnl.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USDT`
        : `-${Math.abs(perf.totalPnl).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USDT`,
      positive: perf.totalPnl >= 0,
      icon: TrendingUp,
      color: perf.totalPnl >= 0 ? '#10B981' : '#EF4444',
      glow: perf.totalPnl >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
    },
    {
      label: 'Trades gagnants',
      value: perf.totalTrades > 0 ? `${perf.winRate.toFixed(1)}%` : '0%',
      icon: Target,
      color: '#06B6D4',
      glow: 'rgba(6,182,212,0.12)',
    },
    {
      label: 'Simulations clôturées',
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

            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
