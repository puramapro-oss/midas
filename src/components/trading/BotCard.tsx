'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Pause,
  Play,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { Badge } from '@/components/ui/Badge'

export interface Bot {
  id: string
  name: string
  pair: string
  strategy: string
  status: 'active' | 'paused' | 'error'
  totalPnl: number
  winRate: number
  totalTrades: number
}

export interface BotCardProps {
  bot: Bot
  onTogglePause?: (botId: string) => void
  onViewDetails?: (botId: string) => void
  className?: string
}

const statusConfig = {
  active: {
    label: 'Actif',
    dotColor: 'bg-emerald-400',
    dotGlow: 'shadow-[0_0_6px_rgba(52,211,153,0.5)]',
    badgeVariant: 'success' as const,
  },
  paused: {
    label: 'En pause',
    dotColor: 'bg-yellow-400',
    dotGlow: 'shadow-[0_0_6px_rgba(250,204,21,0.5)]',
    badgeVariant: 'warning' as const,
  },
  error: {
    label: 'Erreur',
    dotColor: 'bg-red-400',
    dotGlow: 'shadow-[0_0_6px_rgba(248,113,113,0.5)]',
    badgeVariant: 'danger' as const,
  },
}

const strategyLabels: Record<string, string> = {
  dca: 'DCA',
  grid: 'Grid',
  momentum: 'Momentum',
  mean_reversion: 'Mean Rev.',
  breakout: 'Breakout',
  scalping: 'Scalping',
  arbitrage: 'Arbitrage',
}

export function BotCard({
  bot,
  onTogglePause,
  onViewDetails,
  className,
}: BotCardProps) {
  const status = statusConfig[bot.status]
  const isProfitable = bot.totalPnl >= 0
  const pnlFormatted = `${isProfitable ? '+' : ''}${bot.totalPnl.toFixed(2)} $`
  const winRateFormatted = `${bot.winRate.toFixed(1)}%`
  const strategyLabel = strategyLabels[bot.strategy] ?? bot.strategy

  const handleToggle = useCallback(() => {
    onTogglePause?.(bot.id)
  }, [onTogglePause, bot.id])

  const handleDetails = useCallback(() => {
    onViewDetails?.(bot.id)
  }, [onViewDetails, bot.id])

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'relative rounded-2xl border backdrop-blur-xl p-5 transition-all duration-300',
        'bg-white/[0.03] border-white/[0.06]',
        'hover:border-[#FFD700]/20 hover:shadow-[0_0_30px_rgba(255,215,0,0.05)]',
        className
      )}
      data-testid={`bot-card-${bot.id}`}
    >
      {/* Header: Name + Status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">
            {bot.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="gold" size="sm">
              {bot.pair}
            </Badge>
            <Badge variant="default" size="sm">
              {strategyLabel}
            </Badge>
          </div>
        </div>

        {/* Status dot + label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              status.dotColor,
              status.dotGlow
            )}
          />
          <span className="text-[10px] text-white/50">{status.label}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* P&L */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            {isProfitable ? (
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-400" />
            )}
            <span>P&L</span>
          </div>
          <p
            className={cn(
              'text-sm font-semibold font-mono font-[family-name:var(--font-jetbrains)]',
              isProfitable ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {pnlFormatted}
          </p>
        </div>

        {/* Win Rate */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <Target className="h-3 w-3" />
            <span>Win Rate</span>
          </div>
          <p className="text-sm font-semibold text-white font-mono font-[family-name:var(--font-jetbrains)]">
            {winRateFormatted}
          </p>
        </div>

        {/* Trades */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <BarChart3 className="h-3 w-3" />
            <span>Trades</span>
          </div>
          <p className="text-sm font-semibold text-white font-mono font-[family-name:var(--font-jetbrains)]">
            {bot.totalTrades}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleToggle}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200',
            bot.status === 'active'
              ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
          )}
          data-testid={`bot-toggle-${bot.id}`}
        >
          {bot.status === 'active' ? (
            <>
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              <span>Reprendre</span>
            </>
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleDetails}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all duration-200"
          data-testid={`bot-details-${bot.id}`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Détails</span>
          <ExternalLink className="h-3 w-3" />
        </motion.button>
      </div>
    </motion.div>
  )
}

BotCard.displayName = 'BotCard'
export default BotCard
