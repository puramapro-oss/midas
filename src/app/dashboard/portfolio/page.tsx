'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { usePerformance } from '@/hooks/usePerformance'

import { useTrades } from '@/hooks/useTrades'
import { useExchange } from '@/hooks/useExchange'

export default function PortfolioPage() {
  const perf = usePerformance()
  const { openPositions, recentTrades } = useTrades()
  const { connected, balance } = useExchange()
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')

  const totalBalance = balance
  const periodPnl = { day: 0, week: 0, month: perf.totalPnl }
  const periodPnlPct = { day: 0, week: 0, month: totalBalance > 0 ? (perf.totalPnl / totalBalance) * 100 : 0 }

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

      {/* Info when no exchange connected */}
      {!connected && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-tertiary)]">Connecte ton exchange pour voir ta courbe de performance et ton allocation</p>
            <a href="/dashboard/settings/exchanges" className="inline-flex items-center gap-2 px-5 py-2.5 mt-4 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-sm font-semibold hover:bg-[#FFD700]/20 transition-all">
              Connecter un exchange
            </a>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Win Rate', value: `${perf.winRate.toFixed(1)}%`, icon: Target, color: 'text-emerald-400' },
          { label: 'Trades total', value: perf.totalTrades.toString(), icon: BarChart3, color: 'text-[var(--text-primary)]' },
          { label: 'Meilleur trade', value: `+$${perf.bestTrade.toFixed(0)}`, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Pire trade', value: `-$${Math.abs(perf.worstTrade).toFixed(0)}`, icon: TrendingDown, color: 'text-red-400' },
          { label: 'Drawdown max', value: `${perf.maxDrawdown.toFixed(1)}%`, icon: Shield, color: 'text-[#FFD700]' },
          { label: 'Profit Factor', value: perf.profitFactor.toFixed(2), icon: BarChart3, color: 'text-[#FFD700]' },
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

      {/* Trade history */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Historique des trades
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          {recentTrades.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3 className="h-8 w-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-[var(--text-tertiary)]">Aucun trade enregistre</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="trade-history-table">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[10px] font-medium text-white/30 uppercase tracking-wider px-6 py-3">Paire</th>
                    <th className="text-center text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 py-3">Direction</th>
                    <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 py-3">Entry</th>
                    <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 py-3">P&L</th>
                    <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.slice(0, 20).map((trade, i) => {
                    const pnl = Number(trade.pnl ?? 0)
                    const tradePositive = pnl >= 0
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
                            trade.side === 'buy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {trade.side === 'buy' ? 'LONG' : 'SHORT'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                          ${Number(trade.entry_price).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={`text-xs font-semibold ${tradePositive ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                            {tradePositive ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-white/30">{trade.status}</td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
