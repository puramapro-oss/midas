'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

interface AdminRevenueChartProps {
  data: RevenueDataPoint[];
}

interface TooltipPayloadItem {
  value: number;
  payload: RevenueDataPoint;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0F]/95 backdrop-blur-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{item.payload.month}</p>
      <p
        className="text-lg font-bold text-[#FFD700]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {item.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}&nbsp;&euro;
      </p>
    </div>
  );
}

export default function AdminRevenueChart({ data }: AdminRevenueChartProps) {
  const maxRevenue = useMemo(() => {
    if (data.length === 0) return 1000;
    return Math.max(...data.map((d) => d.revenue)) * 1.15;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6">
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Revenus mensuels</h3>
        <div className="flex items-center justify-center h-[300px] text-white/40 text-sm">
          Aucune donnee de revenus disponible
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6">
      <h3 className="text-lg font-semibold text-[#F8FAFC] mb-6">Revenus mensuels</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            />
            <YAxis
              domain={[0, maxRevenue]}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,215,0,0.04)' }}
            />
            <Bar
              dataKey="revenue"
              fill="#FFD700"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              fillOpacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
