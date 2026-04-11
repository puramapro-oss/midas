'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Sparkline from '@/components/charts/Sparkline'

type FilterTab = 'all' | 'gainers' | 'losers'

interface MarketPair {
  symbol: string
  name: string
  price: number
  change24h: number
  volume: string
  signal: 'Achat Fort' | 'Achat' | 'Neutre' | 'Vente' | 'Vente Forte'
  sparklineData: number[]
}

const signalBadgeVariant: Record<MarketPair['signal'], 'success' | 'warning' | 'danger' | 'info' | 'gold'> = {
  'Achat Fort': 'success',
  'Achat': 'success',
  'Neutre': 'warning',
  'Vente': 'danger',
  'Vente Forte': 'danger',
}

// Aucune donnée marché bidon : tant que l'API prix live n'est pas branchée
// sur cette page, on affiche l'empty state plutôt que des chiffres inventés.
const SAMPLE_PAIRS: MarketPair[] = []

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'gainers', label: 'Top Gainers' },
  { id: 'losers', label: 'Top Losers' },
]

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return price.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

export default function MarketsPage() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const filtered = SAMPLE_PAIRS.filter((pair) => {
    const matchesSearch =
      pair.symbol.toLowerCase().includes(search.toLowerCase()) ||
      pair.name.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false
    if (activeFilter === 'gainers') return pair.change24h > 0
    if (activeFilter === 'losers') return pair.change24h < 0
    return true
  }).sort((a, b) => {
    if (activeFilter === 'gainers') return b.change24h - a.change24h
    if (activeFilter === 'losers') return a.change24h - b.change24h
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-orbitron)' }}
          data-testid="markets-title"
        >
          Marches
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Suivez les marches en temps reel et identifiez les opportunites
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une paire..."
            data-testid="markets-search"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/30 focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)] focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              data-testid={`filter-${tab.id}`}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === tab.id
                  ? 'text-[#0A0A0F]'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {activeFilter === tab.id && (
                <motion.div
                  layoutId="market-filter"
                  className="absolute inset-0 rounded-lg bg-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.2)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
              )}
              <span className="relative">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="markets-table">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-6 py-4">
                    Paire
                  </th>
                  <th className="text-right text-xs font-medium text-white/40 uppercase tracking-wider px-6 py-4">
                    Prix
                  </th>
                  <th className="text-right text-xs font-medium text-white/40 uppercase tracking-wider px-6 py-4">
                    24h
                  </th>
                  <th className="text-right text-xs font-medium text-white/40 uppercase tracking-wider px-6 py-4 hidden sm:table-cell">
                    Volume
                  </th>
                  <th className="text-center text-xs font-medium text-white/40 uppercase tracking-wider px-6 py-4 hidden md:table-cell">
                    Tendance
                  </th>
                  <th className="text-center text-xs font-medium text-white/40 uppercase tracking-wider px-6 py-4">
                    Signal IA
                  </th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((pair, i) => {
                  const isPositive = pair.change24h >= 0
                  return (
                    <motion.tr
                      key={pair.symbol}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                      data-testid={`market-row-${pair.symbol.replace('/', '-').toLowerCase()}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#FFD700]/10 flex items-center justify-center text-xs font-bold text-[#FFD700]">
                            {pair.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{pair.symbol}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">{pair.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className="text-sm font-medium text-[var(--text-primary)]"
                          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                        >
                          ${formatPrice(pair.price)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-medium ${
                            isPositive ? 'text-emerald-400' : 'text-red-400'
                          }`}
                          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {isPositive ? '+' : ''}
                          {pair.change24h.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right hidden sm:table-cell">
                        <span className="text-sm text-[var(--text-secondary)]">${pair.volume}</span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex justify-center">
                          <Sparkline
                            data={pair.sparklineData}
                            color="auto"
                            width={80}
                            height={28}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={signalBadgeVariant[pair.signal]} size="sm">
                          {pair.signal}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/analysis/${pair.symbol.replace('/', '-').toLowerCase()}`}
                          data-testid={`analyze-${pair.symbol.replace('/', '-').toLowerCase()}`}
                          className="inline-flex items-center gap-1 text-xs text-[#FFD700]/60 hover:text-[#FFD700] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Analyser
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Search className="h-8 w-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Aucune paire trouvee</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Essayez un autre terme de recherche</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
