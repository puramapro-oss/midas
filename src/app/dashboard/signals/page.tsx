'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

type SignalDirection = 'BUY' | 'SELL' | 'HOLD'
type SignalStatus = 'pending' | 'executed' | 'expired' | 'cancelled'

interface DisplaySignal {
  id: string
  pair: string
  direction: SignalDirection
  entry_price: string
  stop_loss: string
  take_profit: string
  risk_reward: string
  confidence: number
  timeframe: string
  strategy: string
  reasoning: string
  status: SignalStatus
  agents: { agent: string; signal: SignalDirection; confidence: number }[]
  created_at: string
}

// Signaux réels uniquement. Tant qu'aucun signal n'a été généré par les
// 6 agents côté backend, la liste reste vide et un empty state est affiché.
const SAMPLE_SIGNALS: DisplaySignal[] = []

type FilterDirection = 'all' | SignalDirection
type FilterStatus = 'all' | SignalStatus

const directionConfig: Record<SignalDirection, { bg: string; text: string; border: string; icon: typeof TrendingUp }> = {
  BUY: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: TrendingUp },
  SELL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: TrendingDown },
  HOLD: { bg: 'bg-white/[0.06]', text: 'text-white/50', border: 'border-white/[0.08]', icon: Minus },
}

const statusConfig: Record<SignalStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'En attente', color: 'text-[#FFD700]', icon: Clock },
  executed: { label: 'Execute', color: 'text-emerald-400', icon: CheckCircle },
  expired: { label: 'Expire', color: 'text-white/30', icon: AlertCircle },
  cancelled: { label: 'Annule', color: 'text-red-400', icon: XCircle },
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function SignalsPage() {
  const [search, setSearch] = useState('')
  const [filterDirection, setFilterDirection] = useState<FilterDirection>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return SAMPLE_SIGNALS.filter((s) => {
      if (search && !s.pair.toLowerCase().includes(search.toLowerCase())) return false
      if (filterDirection !== 'all' && s.direction !== filterDirection) return false
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      return true
    })
  }, [search, filterDirection, filterStatus])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-orbitron)' }}
          data-testid="signals-page-title"
        >
          Signaux IA
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Historique complet des signaux generes par les 6 sous-agents
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total signaux', value: SAMPLE_SIGNALS.length.toString(), color: 'text-[var(--text-primary)]' },
          { label: 'BUY', value: SAMPLE_SIGNALS.filter((s) => s.direction === 'BUY').length.toString(), color: 'text-emerald-400' },
          { label: 'SELL', value: SAMPLE_SIGNALS.filter((s) => s.direction === 'SELL').length.toString(), color: 'text-red-400' },
          { label: 'Confiance moy.', value: SAMPLE_SIGNALS.length ? `${Math.round(SAMPLE_SIGNALS.reduce((a, s) => a + s.confidence, 0) / SAMPLE_SIGNALS.length)}%` : '—', color: 'text-[#FFD700]' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-white/40 mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une paire..."
            data-testid="signals-search"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value as FilterDirection)}
            data-testid="filter-direction"
            className="h-11 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
          >
            <option value="all">Tous signaux</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="HOLD">HOLD</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            data-testid="filter-status"
            className="h-11 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
          >
            <option value="all">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="executed">Execute</option>
            <option value="expired">Expire</option>
            <option value="cancelled">Annule</option>
          </select>
        </div>
      </div>

      {/* Signals list */}
      <div className="space-y-3">
        {filtered.map((signal, i) => {
          const dir = directionConfig[signal.direction]
          const StatusIcon = statusConfig[signal.status].icon
          const isExpanded = expandedSignal === signal.id

          return (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card>
                <button
                  onClick={() => setExpandedSignal(isExpanded ? null : signal.id)}
                  className="w-full text-left"
                  data-testid={`signal-row-${signal.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Direction badge */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${dir.bg} ${dir.border}`}>
                          <dir.icon className={`h-3.5 w-3.5 ${dir.text}`} />
                          <span className={`text-xs font-bold ${dir.text}`}>{signal.direction}</span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{signal.pair}</span>
                        <Badge variant="info" size="sm">{signal.timeframe}</Badge>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Confidence */}
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                signal.confidence >= 70 ? 'bg-emerald-400' : signal.confidence >= 60 ? 'bg-[#FFD700]' : 'bg-white/30'
                              }`}
                              style={{ width: `${signal.confidence}%` }}
                            />
                          </div>
                          <span
                            className="text-xs font-medium text-white/60 w-8"
                            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                          >
                            {signal.confidence}%
                          </span>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-3.5 w-3.5 ${statusConfig[signal.status].color}`} />
                          <span className={`text-xs ${statusConfig[signal.status].color}`}>
                            {statusConfig[signal.status].label}
                          </span>
                        </div>

                        {/* Time */}
                        <span className="text-xs text-white/30 hidden md:inline">
                          {formatDate(signal.created_at)} {formatTime(signal.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/[0.06]"
                  >
                    <CardContent className="p-4 space-y-4">
                      {/* Key levels */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <p className="text-[10px] text-white/30 uppercase mb-1">Entry</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{signal.entry_price}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 uppercase mb-1">Stop Loss</p>
                          <p className="text-sm font-medium text-red-400" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{signal.stop_loss}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 uppercase mb-1">Take Profit</p>
                          <p className="text-sm font-medium text-emerald-400" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{signal.take_profit}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 uppercase mb-1">R:R</p>
                          <p className="text-sm font-medium text-[#FFD700]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{signal.risk_reward}</p>
                        </div>
                      </div>

                      {/* Strategy + Reasoning */}
                      <div>
                        <p className="text-[10px] text-white/30 uppercase mb-1">Strategie</p>
                        <Badge variant="gold" size="sm">{signal.strategy}</Badge>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase mb-1">Raisonnement IA</p>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{signal.reasoning}</p>
                      </div>

                      {/* Agent votes */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-3.5 w-3.5 text-[#FFD700]" />
                          <p className="text-[10px] text-white/30 uppercase">Votes des sous-agents</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {signal.agents.map((agent) => {
                            const agentDir = directionConfig[agent.signal]
                            return (
                              <div
                                key={agent.agent}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                              >
                                <span className="text-xs text-[var(--text-secondary)]">{agent.agent}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-bold ${agentDir.text}`}>{agent.signal}</span>
                                  <span className="text-[10px] text-white/30" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{agent.confidence}%</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Filter className="h-8 w-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Aucun signal ne correspond aux filtres</p>
          </div>
        )}
      </div>
    </div>
  )
}
