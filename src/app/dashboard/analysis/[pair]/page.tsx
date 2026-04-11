'use client'

import { useState, useEffect, useRef } from 'react'
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
  Loader2,
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

// Aucune analyse fabriquée. Le prix live vient de /api/market/candles
// (voir useEffect plus bas) et le raisonnement reste en empty state tant
// que l'analyse IA n'a pas été déclenchée.
const SAMPLE_DATA: Record<string, PairData> = {}

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
    price: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume: '—',
    signal: 'Neutre',
    signalColor: '#F59E0B',
    reasoning:
      'Aucune analyse disponible pour cette paire. Lance une analyse IA pour obtenir un avis detaille base sur les donnees marche live.',
    scores: { composite: 0, technical: 0, sentiment: 0, onChain: 0 },
  }
}

export default function PairAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const pairSlug = (params?.pair as string) ?? 'btc-usdt'
  const fallback = SAMPLE_DATA[pairSlug] ?? getDefaultData(pairSlug)
  const [data, setData] = useState<PairData>(fallback)

  const [activeTimeframe, setActiveTimeframe] = useState<string>('1h')
  const [strategy, setStrategy] = useState('momentum')
  const [amount, setAmount] = useState('')
  const [stopLoss, setStopLoss] = useState('2')
  const [takeProfit, setTakeProfit] = useState('6')

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartLoading, setChartLoading] = useState(true)

  // Fetch real candles + render lightweight-charts
  useEffect(() => {
    if (!chartContainerRef.current) return
    let chart: ReturnType<typeof import('lightweight-charts').createChart> | null = null
    let cancelled = false
    setChartLoading(true)

    const tfMap: Record<string, '1m' | '5m' | '15m' | '1h' | '4h' | '1d'> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1D': '1d',
      '1W': '1d',
    }
    const tf = tfMap[activeTimeframe] ?? '1h'

    const init = async () => {
      try {
        const lc = await import('lightweight-charts')
        const res = await fetch(
          `/api/market/candles?pair=${encodeURIComponent(data.symbol)}&timeframe=${tf}&limit=200`,
          { cache: 'no-store' }
        )
        if (!res.ok) throw new Error('candles_failed')
        const json = (await res.json()) as { candles: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> }
        if (cancelled || !chartContainerRef.current) return

        // Update header price/change from real candles
        const candles = json.candles ?? []
        if (candles.length >= 2) {
          const last = candles[candles.length - 1]
          const first = candles[0]
          const high24 = candles.reduce((m, c) => Math.max(m, c.high), 0)
          const low24 = candles.reduce((m, c) => (m === 0 ? c.low : Math.min(m, c.low)), 0)
          const vol = candles.reduce((s, c) => s + c.volume, 0)
          const changePct = first.open > 0 ? ((last.close - first.open) / first.open) * 100 : 0
          setData((prev) => ({
            ...prev,
            price: last.close,
            change24h: changePct,
            high24h: high24,
            low24h: low24,
            volume: vol >= 1e9 ? `${(vol / 1e9).toFixed(2)}B` : `${(vol / 1e6).toFixed(0)}M`,
          }))
        }

        chartContainerRef.current.innerHTML = ''
        chart = lc.createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 400,
          layout: {
            background: { type: lc.ColorType.Solid, color: 'transparent' },
            textColor: 'rgba(255,255,255,0.4)',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: 'rgba(255,215,0,0.03)' },
            horzLines: { color: 'rgba(255,215,0,0.03)' },
          },
          rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
          timeScale: {
            borderColor: 'rgba(255,255,255,0.06)',
            timeVisible: true,
            secondsVisible: false,
          },
        })
        const series = chart.addSeries(lc.CandlestickSeries, {
          upColor: '#10B981',
          downColor: '#EF4444',
          borderUpColor: '#10B981',
          borderDownColor: '#EF4444',
          wickUpColor: '#10B981',
          wickDownColor: '#EF4444',
        })
        series.setData(
          (json.candles ?? []).map((c) => ({
            time: Math.floor(c.timestamp / 1000) as import('lightweight-charts').UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        )
        chart.timeScale().fitContent()
        const ro = new ResizeObserver(() => {
          if (chartContainerRef.current && chart) {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth })
          }
        })
        ro.observe(chartContainerRef.current)
      } catch {
        // chart silently empty on error
      } finally {
        if (!cancelled) setChartLoading(false)
      }
    }
    void init()

    return () => {
      cancelled = true
      if (chart) {
        try {
          chart.remove()
        } catch {}
      }
    }
  }, [activeTimeframe, data.symbol])

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

              {/* Live chart */}
              <div className="relative w-full h-[400px] rounded-xl bg-[var(--bg-secondary)] border border-white/[0.04] overflow-hidden">
                <div
                  ref={chartContainerRef}
                  className="w-full h-full"
                  data-testid="chart-container"
                />
                {chartLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/60 backdrop-blur-sm">
                    <Loader2 className="h-6 w-6 text-[#FFD700] animate-spin" />
                  </div>
                )}
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
