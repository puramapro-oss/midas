'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Medal,
  TrendingUp,
  Users,
  Copy,
  Check,
  Crown,
  Shield,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface Trader {
  id: string
  rank: number
  name: string
  avatar: string
  winRate: number
  totalPnl: number
  pnlPercent: number
  totalTrades: number
  sharpeRatio: number
  maxDrawdown: number
  followers: number
  isCopyable: boolean
  strategy: string
}

const SAMPLE_TRADERS: Trader[] = [
  { id: '1', rank: 1, name: 'CryptoKing', avatar: 'CK', winRate: 78.5, totalPnl: 42850, pnlPercent: 85.7, totalTrades: 324, sharpeRatio: 2.84, maxDrawdown: 3.2, followers: 47, isCopyable: true, strategy: 'Momentum' },
  { id: '2', rank: 2, name: 'AlphaTrader', avatar: 'AT', winRate: 72.3, totalPnl: 31200, pnlPercent: 62.4, totalTrades: 412, sharpeRatio: 2.31, maxDrawdown: 4.8, followers: 35, isCopyable: true, strategy: 'Smart Entry' },
  { id: '3', rank: 3, name: 'SatoshiFan', avatar: 'SF', winRate: 69.8, totalPnl: 28400, pnlPercent: 56.8, totalTrades: 256, sharpeRatio: 2.12, maxDrawdown: 5.1, followers: 28, isCopyable: true, strategy: 'Swing' },
  { id: '4', rank: 4, name: 'DeFiWhale', avatar: 'DW', winRate: 74.1, totalPnl: 25100, pnlPercent: 50.2, totalTrades: 189, sharpeRatio: 1.98, maxDrawdown: 3.8, followers: 22, isCopyable: true, strategy: 'DCA' },
  { id: '5', rank: 5, name: 'MoonShot', avatar: 'MS', winRate: 67.2, totalPnl: 21800, pnlPercent: 43.6, totalTrades: 367, sharpeRatio: 1.87, maxDrawdown: 6.2, followers: 19, isCopyable: true, strategy: 'Grid' },
  { id: '6', rank: 6, name: 'BullRunner', avatar: 'BR', winRate: 65.9, totalPnl: 18500, pnlPercent: 37.0, totalTrades: 298, sharpeRatio: 1.72, maxDrawdown: 5.5, followers: 15, isCopyable: true, strategy: 'Momentum' },
  { id: '7', rank: 7, name: 'ChartMaster', avatar: 'CM', winRate: 71.0, totalPnl: 16200, pnlPercent: 32.4, totalTrades: 178, sharpeRatio: 1.65, maxDrawdown: 4.1, followers: 12, isCopyable: true, strategy: 'Mean Reversion' },
  { id: '8', rank: 8, name: 'HodlPro', avatar: 'HP', winRate: 63.4, totalPnl: 14800, pnlPercent: 29.6, totalTrades: 432, sharpeRatio: 1.58, maxDrawdown: 7.0, followers: 10, isCopyable: true, strategy: 'DCA' },
  { id: '9', rank: 9, name: 'ScalpGod', avatar: 'SG', winRate: 60.2, totalPnl: 12500, pnlPercent: 25.0, totalTrades: 856, sharpeRatio: 1.45, maxDrawdown: 4.5, followers: 8, isCopyable: true, strategy: 'Scalping' },
  { id: '10', rank: 10, name: 'TrendSurfer', avatar: 'TS', winRate: 66.8, totalPnl: 11200, pnlPercent: 22.4, totalTrades: 201, sharpeRatio: 1.38, maxDrawdown: 5.8, followers: 6, isCopyable: true, strategy: 'Swing' },
]

const rankIcons: Record<number, typeof Trophy> = {
  1: Crown,
  2: Medal,
  3: Star,
}

const rankColors: Record<number, string> = {
  1: 'text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/20',
  2: 'text-gray-300 bg-gray-300/10 border-gray-300/20',
  3: 'text-amber-600 bg-amber-600/10 border-amber-600/20',
}

export default function LeaderboardPage() {
  const [copying, setCopying] = useState<string | null>(null)
  const [copiedTraders, setCopiedTraders] = useState<Set<string>>(new Set())

  const handleCopy = (traderId: string) => {
    if (copiedTraders.has(traderId)) {
      setCopiedTraders((prev) => {
        const next = new Set(prev)
        next.delete(traderId)
        return next
      })
      return
    }
    setCopying(traderId)
    setTimeout(() => {
      setCopiedTraders((prev) => new Set(prev).add(traderId))
      setCopying(null)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-orbitron)' }}
          data-testid="leaderboard-title"
        >
          Leaderboard
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Les meilleurs traders MIDAS. Copie les strategies des top performers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-4 w-4 text-[#FFD700] mx-auto mb-1.5" />
            <p className="text-xs text-white/40 mb-0.5">Top Win Rate</p>
            <p className="text-lg font-bold text-emerald-400" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {SAMPLE_TRADERS[0].winRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-4 w-4 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-xs text-white/40 mb-0.5">Top P&L</p>
            <p className="text-lg font-bold text-[#FFD700]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              +{SAMPLE_TRADERS[0].pnlPercent}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-4 w-4 text-blue-400 mx-auto mb-1.5" />
            <p className="text-xs text-white/40 mb-0.5">Meilleur Sharpe</p>
            <p className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {SAMPLE_TRADERS[0].sharpeRatio}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-4 w-4 text-purple-400 mx-auto mb-1.5" />
            <p className="text-xs text-white/40 mb-0.5">Total copieurs</p>
            <p className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {SAMPLE_TRADERS.reduce((s, t) => s + t.followers, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="leaderboard-table">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] font-medium text-white/30 uppercase tracking-wider px-4 py-3">#</th>
                  <th className="text-left text-[10px] font-medium text-white/30 uppercase tracking-wider px-4 py-3">Trader</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-4 py-3">Win Rate</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-4 py-3">P&L %</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Trades</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Sharpe</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Drawdown</th>
                  <th className="text-center text-[10px] font-medium text-white/30 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Strategie</th>
                  <th className="text-center text-[10px] font-medium text-white/30 uppercase tracking-wider px-4 py-3">Copier</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_TRADERS.map((trader, i) => {
                  const RankIcon = rankIcons[trader.rank]
                  const isCopied = copiedTraders.has(trader.id)

                  return (
                    <motion.tr
                      key={trader.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                      data-testid={`trader-row-${trader.rank}`}
                    >
                      <td className="px-4 py-3">
                        {RankIcon ? (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${rankColors[trader.rank]}`}>
                            <RankIcon className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <span className="text-sm text-white/30 font-medium pl-1.5" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                            {trader.rank}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center text-[10px] font-bold text-[#FFD700]">
                            {trader.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{trader.name}</p>
                            <p className="text-[10px] text-white/30">{trader.followers} copieurs</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-emerald-400" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                          {trader.winRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-[#FFD700]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                          +{trader.pnlPercent}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-xs text-white/40" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                          {trader.totalTrades}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-xs text-white/60" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                          {trader.sharpeRatio}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-xs text-red-400/60" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                          -{trader.maxDrawdown}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <Badge variant="info" size="sm">{trader.strategy}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleCopy(trader.id)}
                          disabled={copying === trader.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isCopied
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : 'bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/20'
                          } disabled:opacity-50`}
                          data-testid={`copy-trader-${trader.rank}`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copie
                            </>
                          ) : copying === trader.id ? (
                            'Copie...'
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copier
                            </>
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <Shield className="h-4 w-4 text-[#FFD700] shrink-0 mt-0.5" />
        <div className="text-xs text-white/40 leading-relaxed">
          <p className="font-medium text-white/60 mb-1">Comment fonctionne le copy trading ?</p>
          <p>Quand tu copies un trader, chaque trade qu'il execute est automatiquement replique sur ton compte, proportionnellement a ton capital. Tu peux arreter de copier a tout moment. Les performances passees ne garantissent pas les resultats futurs.</p>
        </div>
      </div>
    </div>
  )
}
