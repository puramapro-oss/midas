'use client';

import { DollarSign, Target, TrendingUp, Link2 } from 'lucide-react';
import { usePerformance } from '@/hooks/usePerformance';
import { useExchange } from '@/hooks/useExchange';

export default function PortfolioOverview() {
  const perf = usePerformance();
  const { connected, balance } = useExchange();

  if (!connected) {
    return (
      <div data-testid="portfolio-overview">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#FFD700]/10 flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-6 h-6 text-[#FFD700]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Connecte ton exchange
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-4 max-w-md mx-auto">
            Pour voir ton solde, tes positions et tes performances, connecte ton exchange dans les parametres.
          </p>
          <a
            href="/dashboard/settings/exchanges"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-sm font-semibold hover:bg-[#FFD700]/20 transition-all"
          >
            Connecter un exchange
          </a>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Balance',
      value: `$${balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'var(--gold-primary)',
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
    },
    {
      label: 'Win Rate',
      value: perf.totalTrades > 0 ? `${perf.winRate.toFixed(1)}%` : '0%',
      icon: Target,
      color: '#06B6D4',
    },
    {
      label: 'Trades',
      value: perf.totalTrades.toString(),
      icon: TrendingUp,
      color: 'var(--gold-primary)',
    },
  ];

  return (
    <div data-testid="portfolio-overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 hover:border-[var(--gold-primary)]/20 transition-all duration-300"
            data-testid={`kpi-${stat.label.toLowerCase().replace(/[^a-z]/g, '-')}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">{stat.label}</span>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
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
        ))}
      </div>
    </div>
  );
}
