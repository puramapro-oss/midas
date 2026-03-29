'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

interface PnLDataPoint {
  date: string;
  pnl: number;
}

interface PnLChartProps {
  data: PnLDataPoint[];
}

function PnLTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value;
  const isPositive = value >= 0;

  return (
    <div className="glass-gold px-3 py-2 rounded-lg text-xs">
      <p className="text-[var(--text-secondary)] mb-0.5">{label}</p>
      <p
        className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {isPositive ? '+' : ''}${value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export default function PnLChart({ data }: PnLChartProps) {
  return (
    <div className="w-full h-[200px]" data-testid="pnl-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
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
            tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}$${v}`}
            width={56}
          />
          <Tooltip content={<PnLTooltip />} />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={32}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
