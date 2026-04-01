'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EquityCurve from '@/components/charts/EquityCurve'
import PnLChart from '@/components/charts/PnLChart'
import { usePerformance } from '@/hooks/usePerformance'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

// Sample data
const ALLOCATION_DATA = [
  { name: 'BTC', value: 45, color: '#F7931A' },
  { name: 'ETH', value: 25, color: '#627EEA' },
  { name: 'SOL', value: 15, color: '#00FFA3' },
  { name: 'BNB', value: 8, color: '#F3BA2F' },
  { name: 'Autres', value: 7, color: '#8B8B8B' },
]

const EQUITY_DATA = Array.from({ length: 60 }, (_, i) => {
  const base = 50000
  const trend = i * 30
  const noise = (Math.random() - 0.4) * 500
  return {
    date: new Date(Date.now() - (60 - i) * 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    value: Math.round(base + trend + noise),
  }
})

const PNL_DATA = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (14 - i) * 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
  pnl: Math.round((Math.random() - 0.35) * 400),
}))

const TRADE_HISTORY = [
  { id: '1', pair: 'BTC/USDT', direction: 'BUY' as const, entry: 64200, exit: 67234, pnl: 420.50, pnlPercent: 4.7, date: '01 avr 14:32' },
  { id: '2', pair: 'SOL/USDT', direction: 'BUY' as const, entry: 168.20, exit: 178.42, pnl: 153.30, pnlPercent: 6.1, date: '01 avr 10:15' },
  { id: '3', pair: 'ETH/USDT', direction: 'SELL' as const, entry: 3500, exit: 3421.80, pnl: 78.20, pnlPercent: 2.2, date: '31 mar 22:00' },
  { id: '4', pair: 'AVAX/USDT', direction: 'BUY' as const, entry: 40.50, exit: 38.67, pnl: -91.50, pnlPercent: -4.5, date: '31 mar 18:30' },
  { id: '5', pair: 'DOGE/USDT', direction: 'BUY' as const, entry: 0.1650, exit: 0.1823, pnl: 86.50, pnlPercent: 10.5, date: '31 mar 14:00' },
  { id: '6', pair: 'XRP/USDT', direction: 'SELL' as const, entry: 0.6500, exit: 0.6234, pnl: 53.20, pnlPercent: 4.1, date: '30 mar 20:00' },
  { id: '7', pair: 'BNB/USDT', direction: 'BUY' as const, entry: 620, exit: 612.30, pnl: -38.50, pnlPercent: -1.2, date: '30 mar 16:00' },
]

function PieTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-gold px-3 py-2 rounded-lg text-xs">
      <p className="text-[var(--text-secondary)]">{payload[0].name}</p>
      <p className="font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
        {payload[0].value}%
      </p>
    </div>
  )
}

export default function PortfolioPage() {
  const perf = usePerformance()
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')

  const totalBalance = 52_847.30
  const periodPnl = { day: 420.50, week: 1247.80, month: 3842.10 }
  const periodPnlPct = { day: 0.8, week: 2.4, month: 7.8 }

  const currentPnl = periodPnl[period]
  const currentPnlPct = periodPnlPct[period]
  const isPositive = currentPnl >= 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-orbitron)' }}
          data-testid="portfolio-title"
        >
          Portfolio
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Vue d'ensemble de tes performances et allocations
        </p>
      </div>

      {/* Total balance + P&L */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card variant="highlighted">
          <CardContent className="p-6">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Solde total</p>
            <p
              className="text-3xl font-bold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              data-testid="total-balance"
            >
              ${totalBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/40 uppercase tracking-wider">P&L</p>
              <div className="flex gap-1">
                {(['day', 'week', 'month'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    data-testid={`period-${p}`}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      period === p
                        ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    {p === 'day' ? '24h' : p === 'week' ? '7j' : '30j'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <p
                className={`text-3xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                data-testid="period-pnl"
              >
                {isPositive ? '+' : ''}${currentPnl.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </p>
              <span className={`flex items-center gap-0.5 text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {isPositive ? '+' : ''}{currentPnlPct}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Equity curve */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#FFD700]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  Courbe de performance
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              <EquityCurve data={EQUITY_DATA} />
            </CardContent>
          </Card>
        </div>

        {/* Allocation pie */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-[#FFD700]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
                Allocation
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]" data-testid="allocation-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ALLOCATION_DATA}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {ALLOCATION_DATA.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {ALLOCATION_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-[var(--text-secondary)]">{item.name}</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Win Rate', value: `${perf.winRate > 0 ? perf.winRate.toFixed(1) : '68.5'}%`, icon: Target, color: 'text-emerald-400' },
          { label: 'Trades total', value: perf.totalTrades > 0 ? perf.totalTrades.toString() : '47', icon: BarChart3, color: 'text-[var(--text-primary)]' },
          { label: 'Meilleur trade', value: `+$${perf.bestTrade > 0 ? perf.bestTrade.toFixed(0) : '842'}`, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Pire trade', value: `-$${Math.abs(perf.worstTrade > 0 ? perf.worstTrade : -218).toFixed(0)}`, icon: TrendingDown, color: 'text-red-400' },
          { label: 'Drawdown max', value: `${perf.maxDrawdown > 0 ? perf.maxDrawdown.toFixed(1) : '4.2'}%`, icon: Shield, color: 'text-[#FFD700]' },
          { label: 'Profit Factor', value: perf.profitFactor > 0 ? perf.profitFactor.toFixed(2) : '2.14', icon: BarChart3, color: 'text-[#FFD700]' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className={`h-4 w-4 mx-auto mb-2 ${stat.color}`} />
              <p className="text-[10px] text-white/30 uppercase mb-1">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* P&L daily chart */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            P&L quotidien
          </h3>
        </CardHeader>
        <CardContent>
          <PnLChart data={PNL_DATA} />
        </CardContent>
      </Card>

      {/* Trade history */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Historique des trades
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="trade-history-table">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] font-medium text-white/30 uppercase tracking-wider px-6 py-3">Paire</th>
                  <th className="text-center text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 py-3">Direction</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 py-3">Entry</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 py-3">Exit</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 py-3">P&L</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {TRADE_HISTORY.map((trade, i) => {
                  const tradePositive = trade.pnl >= 0
                  return (
                    <motion.tr
                      key={trade.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-3 text-sm font-medium text-[var(--text-primary)]">{trade.pair}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          trade.direction === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        ${trade.entry.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        ${trade.exit.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`text-xs font-semibold ${tradePositive ? 'text-emerald-400' : 'text-red-400'}`}
                            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                          >
                            {tradePositive ? '+' : ''}${trade.pnl.toFixed(2)}
                          </span>
                          <span className={`text-[10px] ${tradePositive ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                            {tradePositive ? '+' : ''}{trade.pnlPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-white/30 hidden sm:table-cell">{trade.date}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
