'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Brain,
  Activity,
  BarChart3,
  Link2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import RingGauge from '@/components/charts/RingGauge'

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'] as const

interface PairData {
  symbol: string
  displayName: string
  price: number
  change24h: number
  high24h: number
  low24h: number
  volume: string
  signal: string
  signalColor: string
  reasoning: string
  scores: {
    composite: number
    technical: number
    sentiment: number
    onChain: number
  }
}

const SAMPLE_DATA: Record<string, PairData> = {
  'btc-usdt': {
    symbol: 'BTC/USDT',
    displayName: 'Bitcoin / Tether',
    price: 67234.50,
    change24h: 2.3,
    high24h: 67890.00,
    low24h: 65120.00,
    volume: '2.4B',
    signal: 'Achat Fort',
    signalColor: '#10B981',
    reasoning:
      'Le BTC montre une forte dynamique haussiere avec un support solide a 65 000$. Le RSI est a 62 (zone neutre-haussiere), le MACD vient de croiser positivement, et les volumes sont en augmentation de 34% par rapport a la moyenne 7 jours. La domination BTC est stable a 52%, soutenue par des flux institutionnels positifs. Les donnees on-chain montrent une accumulation par les whales avec une diminution des reserves sur les exchanges.',
    scores: { composite: 78, technical: 82, sentiment: 71, onChain: 80 },
  },
  'eth-usdt': {
    symbol: 'ETH/USDT',
    displayName: 'Ethereum / Tether',
    price: 3421.80,
    change24h: -0.8,
    high24h: 3480.00,
    low24h: 3390.00,
    volume: '1.1B',
    signal: 'Neutre',
    signalColor: '#F59E0B',
    reasoning:
      'L\'ETH consolide autour de 3 400$ apres une legere correction. Le RSI est a 48, zone neutre. Le ratio ETH/BTC est stable. Les volumes sont dans la moyenne. Les frais gas restent bas, suggerant une activite reseau moderee. Attente d\'un catalyseur pour une direction claire.',
    scores: { composite: 52, technical: 48, sentiment: 55, onChain: 54 },
  },
  'sol-usdt': {
    symbol: 'SOL/USDT',
    displayName: 'Solana / Tether',
    price: 178.42,
    change24h: 5.1,
    high24h: 180.50,
    low24h: 168.20,
    volume: '890M',
    signal: 'Achat Fort',
    signalColor: '#10B981',
    reasoning:
      'SOL affiche un momentum tres haussier avec une cassure du niveau 175$ confirme par des volumes importants. Le RSI est a 68, proche de la surachat mais avec de la marge. L\'ecosysteme Solana enregistre un ATH de TVL DeFi. Les metriques sociales sont tres positives.',
    scores: { composite: 85, technical: 88, sentiment: 82, onChain: 84 },
  },
}

const STRATEGIES = [
  { value: 'dca', label: 'DCA (Dollar Cost Averaging)' },
  { value: 'grid', label: 'Grid Trading' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'breakout', label: 'Breakout' },
]

function getDefaultData(pairSlug: string): PairData {
  return {
    symbol: pairSlug.replace('-', '/').toUpperCase(),
    displayName: pairSlug.replace('-', ' / ').toUpperCase(),
    price: 100.00,
    change24h: 0,
    high24h: 105.00,
    low24h: 95.00,
    volume: '50M',
    signal: 'Neutre',
    signalColor: '#F59E0B',
    reasoning: 'Donnees insuffisantes pour une analyse complete. Connectez un exchange pour obtenir des donnees en temps reel.',
    scores: { composite: 50, technical: 50, sentiment: 50, onChain: 50 },
  }
}

export default function PairAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const pairSlug = (params?.pair as string) ?? 'btc-usdt'
  const data = SAMPLE_DATA[pairSlug] ?? getDefaultData(pairSlug)

  const [activeTimeframe, setActiveTimeframe] = useState<string>('1h')
  const [strategy, setStrategy] = useState('momentum')
  const [amount, setAmount] = useState('')
  const [stopLoss, setStopLoss] = useState('2')
  const [takeProfit, setTakeProfit] = useState('6')

  const isPositive = data.change24h >= 0

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          data-testid="back-button"
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-2xl font-bold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-orbitron)' }}
              data-testid="pair-title"
            >
              {data.symbol}
            </h1>
            <Badge
              variant={isPositive ? 'success' : 'danger'}
              icon={isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            >
              {isPositive ? '+' : ''}{data.change24h.toFixed(1)}%
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{data.displayName}</p>
        </div>
        <div className="text-right">
          <p
            className="text-2xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            data-testid="pair-price"
          >
            ${data.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-0.5">
            <span>H: ${data.high24h.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
            <span>L: ${data.low24h.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
            <span>Vol: ${data.volume}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart + Timeframe */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-4">
              {/* Timeframe buttons */}
              <div className="flex items-center gap-1 mb-4">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeframe(tf)}
                    data-testid={`tf-${tf}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTimeframe === tf
                        ? 'bg-[#FFD700] text-[#0A0A0F] shadow-[0_0_8px_rgba(255,215,0,0.2)]'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Chart placeholder */}
              <div
                className="w-full h-[400px] rounded-xl bg-[var(--bg-secondary)] border border-white/[0.04] flex items-center justify-center"
                data-testid="chart-placeholder"
              >
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-tertiary)]">Graphique TradingView</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">{data.symbol} - {activeTimeframe}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Scores */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#FFD700]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  Scores IA
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6" data-testid="ai-scores">
                <RingGauge value={data.scores.composite} label="Composite" color="#FFD700" size={100} />
                <RingGauge value={data.scores.technical} label="Technique" color="#3B82F6" size={100} />
                <RingGauge value={data.scores.sentiment} label="Sentiment" color="#8B5CF6" size={100} />
                <RingGauge value={data.scores.onChain} label="On-Chain" color="#10B981" size={100} />
              </div>
            </CardContent>
          </Card>

          {/* Signal + Reasoning */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#FFD700]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
                    Signal
                  </h2>
                </div>
                <Badge
                  variant={data.signal.includes('Achat') ? 'success' : data.signal.includes('Vente') ? 'danger' : 'warning'}
                  size="md"
                >
                  {data.signal}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed" data-testid="signal-reasoning">
                {data.reasoning}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trade Panel */}
        <div className="space-y-6">
          <Card variant="highlighted">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-[#FFD700]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  Panneau de Trade
                </h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Strategy select */}
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Strategie</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  data-testid="strategy-select"
                  className="w-full h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                  {STRATEGIES.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#111116]">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Montant (USDT)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="amount-input"
                  className="w-full h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm font-mono placeholder:text-white/20 focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)] focus:outline-none transition-all"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                />
                <div className="flex gap-2 mt-2">
                  {['25', '50', '75', '100'].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setAmount((Number(pct) * 10).toString())}
                      className="flex-1 py-1.5 rounded-lg text-xs text-white/40 border border-white/[0.06] hover:border-[#FFD700]/30 hover:text-[#FFD700]/60 transition-all"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* SL / TP */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Stop Loss (%)</label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    data-testid="stop-loss-input"
                    className="w-full h-11 px-4 rounded-xl border border-red-500/20 bg-red-500/[0.03] text-red-400 text-sm font-mono placeholder:text-white/20 focus:border-red-500/40 focus:outline-none transition-all"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Take Profit (%)</label>
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    data-testid="take-profit-input"
                    className="w-full h-11 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-400 text-sm font-mono placeholder:text-white/20 focus:border-emerald-500/40 focus:outline-none transition-all"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  />
                </div>
              </div>

              {/* Risk reward */}
              {stopLoss && takeProfit && Number(stopLoss) > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <span className="text-xs text-[var(--text-tertiary)]">Ratio Risque/Rendement</span>
                  <span
                    className="text-sm font-medium text-[#FFD700]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  >
                    1:{(Number(takeProfit) / Number(stopLoss)).toFixed(1)}
                  </span>
                </motion.div>
              )}

              {/* Execute button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                data-testid="execute-trade"
                disabled={!amount || Number(amount) <= 0}
              >
                Executer le Trade
              </Button>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/[0.06] border border-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-orange-400/80 leading-relaxed">
                  Le trading comporte des risques de perte en capital. Les signaux IA ne constituent pas des conseils financiers. Investissez uniquement ce que vous pouvez vous permettre de perdre.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="py-4">
              <div className="space-y-3">
                {[
                  { label: 'Volume 24h', value: `$${data.volume}` },
                  { label: 'Plus haut 24h', value: `$${data.high24h.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}` },
                  { label: 'Plus bas 24h', value: `$${data.low24h.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}` },
                  { label: 'Score composite', value: `${data.scores.composite}/100` },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-tertiary)]">{stat.label}</span>
                    <span
                      className="text-sm font-medium text-[var(--text-primary)]"
                      style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                    >
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
