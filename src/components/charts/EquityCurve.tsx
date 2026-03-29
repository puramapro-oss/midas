'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface EquityCurveDataPoint {
  date: string;
  value: number;
}

interface EquityCurveProps {
  data: EquityCurveDataPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-gold px-3 py-2 rounded-lg text-xs">
      <p className="text-[var(--text-secondary)] mb-0.5">{label}</p>
      <p
        className="font-semibold text-[var(--gold-primary)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        ${payload[0].value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export default function EquityCurve({ data }: EquityCurveProps) {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const ranges = ['7d', '30d', '90d', 'all'] as const;
  const rangeLimits: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, all: Infinity };

  const filteredData = data.slice(-rangeLimits[range]);

  return (
    <div data-testid="equity-curve">
      {/* Range toggle */}
      <div className="flex items-center gap-1 mb-4">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            data-testid={`equity-range-${r}`}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              range === r
                ? 'bg-[var(--gold-muted)] text-[var(--gold-primary)] border border-[var(--gold-primary)]/20'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-white/[0.04]'
            }`}
          >
            {r === 'all' ? 'Tout' : r.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFD700" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#FFD700" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(248,250,252,0.35)', fontSize: 10 }}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(248,250,252,0.35)', fontSize: 10 }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#FFD700"
              strokeWidth={2}
              fill="url(#goldGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#FFD700',
                stroke: '#06080F',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
