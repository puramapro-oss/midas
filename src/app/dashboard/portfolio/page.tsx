'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { usePerformance } from '@/hooks/usePerformance'


export default function PortfolioPage() {
  const perf = usePerformance()
  const recentTrades = perf.recentTrades
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')

  if (perf.loading) return <p role="status">Chargement des performances simulées…</p>
  if (perf.error) return <div role="alert" className="space-y-3 text-red-400">
    <p>{perf.error}</p>
    <button onClick={() => void perf.refresh()} className="underline">Réessayer</button>
  </div>
  const currentPnl = perf.periodPnl[period]
  const isPositive = currentPnl >= 0
  const money = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USDT`

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
          Simulation uniquement · résultats réalisés, nets des frais enregistrés
        </p>
      </div>

      {/* Total balance + P&L */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card variant="highlighted">
          <CardContent className="p-6">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">P&L net réalisé — historique complet</p>
            <p
              className="text-3xl font-bold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              data-testid="total-balance"
            >
              {money(perf.totalPnl)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/40 uppercase tracking-wider">P&L net réalisé</p>
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
                {money(currentPnl)}
              </p>

            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-[var(--text-secondary)]">
        Fenêtres glissantes de 24 h, 7 j et 30 j à la dernière lecture. Les positions ouvertes,
        les soldes réels et les pertes latentes ne sont pas inclus. Le drawdown est exprimé
        en USDT sur les résultats clôturés ; ce n’est pas un drawdown intrajournalier du portefeuille.
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Win Rate', value: `${perf.winRate.toFixed(1)}%`, icon: Target, color: 'text-emerald-400' },
          { label: 'Trades total', value: perf.totalTrades.toString(), icon: BarChart3, color: 'text-[var(--text-primary)]' },
          { label: 'Meilleur trade', value: money(perf.bestTrade), icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Pire trade', value: money(perf.worstTrade), icon: TrendingDown, color: 'text-red-400' },
          { label: 'Drawdown réalisé', value: `${perf.maxDrawdown.toFixed(2)} USDT`, icon: Shield, color: 'text-[#FFD700]' },
          { label: 'Profit Factor', value: perf.profitFactor === null ? 'Non défini' : perf.profitFactor.toFixed(2), icon: BarChart3, color: 'text-[#FFD700]' },
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
            Derniers trades simulés clôturés (20 maximum)
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
                    const pnl = trade.netPnl
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
                          {Number(trade.entry_price).toLocaleString('fr-FR')} USDT
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={`text-xs font-semibold ${tradePositive ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                            {money(pnl)}
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
