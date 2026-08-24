'use client';

import { Card, CardContent } from '@/components/ui/Card';
import type { PairData } from '@/lib/analysis/constants';

interface QuickStatsProps {
  data: PairData;
}

export default function QuickStats({ data }: QuickStatsProps) {
  const stats = [
    { label: 'Volume 24h', value: `$${data.volume}` },
    { label: 'Plus haut 24h', value: `$${data.high24h.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}` },
    { label: 'Plus bas 24h', value: `$${data.low24h.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}` },
    { label: 'Score composite', value: `${data.scores.composite}/100` },
  ];

  return (
    <Card>
      <CardContent className="py-4">
        <div className="space-y-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-tertiary)]">{stat.label}</span>
              <span
                className="text-sm font-medium text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
