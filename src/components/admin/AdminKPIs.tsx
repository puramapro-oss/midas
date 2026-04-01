'use client';

import { Users, DollarSign, TrendingUp, Bot } from 'lucide-react';
import { cn } from '@/lib/utils/formatters';

interface AdminStats {
  totalUsers: number;
  estimatedMRR: number;
  tradesToday: number;
  activeBots: number;
}

interface AdminKPIsProps {
  stats: AdminStats;
}

const kpis = [
  {
    key: 'totalUsers' as const,
    label: 'Total Utilisateurs',
    icon: Users,
    format: (v: number) => v.toLocaleString('fr-FR'),
    suffix: '',
  },
  {
    key: 'estimatedMRR' as const,
    label: 'MRR Estime',
    icon: DollarSign,
    format: (v: number) => `${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    suffix: ' EUR',
  },
  {
    key: 'tradesToday' as const,
    label: 'Trades Aujourd\'hui',
    icon: TrendingUp,
    format: (v: number) => v.toLocaleString('fr-FR'),
    suffix: '',
  },
  {
    key: 'activeBots' as const,
    label: 'Bots Actifs',
    icon: Bot,
    format: (v: number) => v.toLocaleString('fr-FR'),
    suffix: '',
  },
];

export default function AdminKPIs({ stats }: AdminKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const value = stats[kpi.key];

        return (
          <div
            key={kpi.key}
            className={cn(
              'relative rounded-2xl border backdrop-blur-xl p-6 transition-all duration-300',
              'bg-white/[0.03] border-white/[0.06]',
              'hover:border-[#FFD700]/20 hover:shadow-[0_0_30px_rgba(255,215,0,0.05)]'
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-white/60">{kpi.label}</span>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FFD700]/10">
                <Icon className="w-5 h-5 text-[#FFD700]" />
              </div>
            </div>
            <p
              className="text-2xl font-bold text-[#F8FAFC]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {kpi.format(value)}{kpi.suffix}
            </p>
          </div>
        );
      })}
    </div>
  );
}
