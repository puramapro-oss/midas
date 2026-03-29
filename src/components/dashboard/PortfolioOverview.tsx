'use client';

import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import EquityCurve from '@/components/charts/EquityCurve';

const stats = [
  {
    label: 'Balance',
    value: '$12,450',
    change: null,
    icon: DollarSign,
    color: 'var(--gold-primary)',
  },
  {
    label: 'P&L Jour',
    value: '+$234',
    change: '+1.9%',
    icon: TrendingUp,
    positive: true,
    color: '#10B981',
  },
  {
    label: 'P&L Total',
    value: '+$2,450',
    change: '+24.5%',
    icon: TrendingUp,
    positive: true,
    color: '#10B981',
  },
  {
    label: 'Win Rate',
    value: '68%',
    change: null,
    icon: Target,
    color: '#06B6D4',
  },
];

function generateEquityData() {
  const data = [];
  let value = 10000;
  const now = new Date();

  for (let i = 90; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    value += (Math.random() - 0.42) * 150;
    value = Math.max(value, 8000);
    data.push({
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      value: Math.round(value * 100) / 100,
    });
  }

  return data;
}

const equityData = generateEquityData();

export default function PortfolioOverview() {
  return (
    <div data-testid="portfolio-overview">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 hover:border-[var(--gold-primary)]/20 transition-all duration-300"
            data-testid={`kpi-${stat.label.toLowerCase().replace(/[^a-z]/g, '-')}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">
                {stat.label}
              </span>
              <stat.icon
                className="w-4 h-4"
                style={{ color: stat.color }}
              />
            </div>
            <p
              className="text-xl font-bold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {stat.value}
            </p>
            {stat.change && (
              <div className="flex items-center gap-1 mt-1">
                {stat.positive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <span
                  className={`text-xs font-medium ${
                    stat.positive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  {stat.change}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Equity curve */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 font-[family-name:var(--font-orbitron)]">
          Courbe de Capital
        </h3>
        <EquityCurve data={equityData} />
      </div>
    </div>
  );
}
