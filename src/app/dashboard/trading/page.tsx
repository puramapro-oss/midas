'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Brain,
  Shield,
  ChevronDown,
  RefreshCw,
  Loader2,
  Play,
  Bot,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { useMarketStore } from '@/stores/market-store'

const PAIRS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT',
  'XRP/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOGE/USDT',
  'DOT/USDT', 'LINK/USDT', 'MATIC/USDT', 'UNI/USDT',
]

const TIMEFRAMES = [
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1J' },
]

interface AgentVote {
  agent: string
  label: string
  signal: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  icon: string
}

const SAMPLE_AGENTS: AgentVote[] = [
  { agent: 'technical', label: 'Technique', signal: 'BUY', confidence: 82, icon: '📊' },
  { agent: 'sentiment', label: 'Sentiment', signal: 'BUY', confidence: 71, icon: '💭' },
  { agent: 'onchain', label: 'On-Chain', signal: 'HOLD', confidence: 55, icon: '🔗' },
  { agent: 'calendar', label: 'Calendrier', signal: 'BUY', confidence: 65, icon: '📅' },
  { agent: 'pattern', label: 'Patterns', signal: 'BUY', confidence: 78, icon: '📐' },
  { agent: 'risk', label: 'Risque', signal: 'BUY', confidence: 74, icon: '🛡' },
]

interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function generateSampleCandles(count: number): CandleData[] {
  const candles: CandleData[] = []
  let price = 67000
  const now = Math.floor(Date.now() / 1000)

  for (let i = count; i > 0; i--) {
    const open = price
    const change = (Math.random() - 0.48) * 400
    const close = open + change
    const high = Math.max(open, close) + Math.random() * 200
    const low = Math.min(open, close) - Math.random() * 200
    const volume = 500 + Math.random() * 2000

    candles.push({
      time: now - i * 3600,
      open,
      high,
      low,
      close,
      volume,
    })
    price = close
  }
  return candles
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return price.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}

const signalColors = {
  BUY: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  SELL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  HOLD: { bg: 'bg-white/[0.06]', text: 'text-white/50', border: 'border-white/[0.08]' },
}

export default function TradingPage() {
  const [selectedPair, setSelectedPair] = useState('BTC/USDT')
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h')
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false)
  const [candles, setCandles] = useState<CandleData[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null)

  const { prices } = useMarketStore()
  const currentPrice = prices[selectedPair]

  // Generate sample data on mount
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setCandles(generateSampleCandles(100))
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedPair, selectedTimeframe])

  // Initialize lightweight-charts
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return

    let chart: ReturnType<typeof import('lightweight-charts').createChart> | null = null

    const initChart = async () => {
      const lc = await import('lightweight-charts')

      if (!chartContainerRef.current) return

      // Clear previous chart
      chartContainerRef.current.innerHTML = ''

      chart = lc.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 420,
        layout: {
          background: { type: lc.ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255, 255, 255, 0.4)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: 'rgba(255, 215, 0, 0.03)' },
          horzLines: { color: 'rgba(255, 215, 0, 0.03)' },
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
          vertLine: { color: 'rgba(255, 215, 0, 0.3)', width: 1, style: 2 },
          horzLine: { color: 'rgba(255, 215, 0, 0.3)', width: 1, style: 2 },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.06)',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.06)',
          timeVisible: true,
          secondsVisible: false,
        },
      })

      const candlestickSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderUpColor: '#10B981',
        borderDownColor: '#EF4444',
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      })

      candlestickSeries.setData(
        candles.map((c) => ({
          time: c.time as import('lightweight-charts').UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      )

      const volumeSeries = chart.addSeries(lc.HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })

      volumeSeries.setData(
        candles.map((c) => ({
          time: c.time as import('lightweight-charts').UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        }))
      )

      chart.timeScale().fitContent()
      chartRef.current = chart

      // Resize observer
      const resizeObserver = new ResizeObserver(() => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth })
        }
      })
      resizeObserver.observe(chartContainerRef.current)

      return () => {
        resizeObserver.disconnect()
        chart?.remove()
      }
    }

    initChart()

    return () => {
      chart?.remove()
    }
  }, [candles])

  const handleAnalyze = useCallback(() => {
    setAnalyzing(true)
    setTimeout(() => setAnalyzing(false), 2000)
  }, [])

  const lastCandle = candles[candles.length - 1]
  const prevCandle = candles[candles.length - 2]
  const priceChange = lastCandle && prevCandle ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100 : 0
  const isPositive = priceChange >= 0

  return (
    <div className="space-y-4">
      {/* Header: Pair selector + price */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Pair selector */}
          <div className="relative">
            <button
              onClick={() => setPairDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#FFD700]/30 transition-all"
              data-testid="pair-selector"
            >
              <div className="w-7 h-7 rounded-lg bg-[#FFD700]/10 flex items-center justify-center text-[10px] font-bold text-[#FFD700]">
                {selectedPair.split('/')[0].substring(0, 2)}
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedPair}</span>
              <ChevronDown className="h-4 w-4 text-white/30" />
            </button>

            <AnimatePresence>
              {pairDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  className="absolute top-full mt-2 left-0 z-50 w-52 max-h-64 overflow-y-auto rounded-xl bg-[#111115] border border-white/[0.08] shadow-2xl"
                >
                  {PAIRS.map((pair) => (
                    <button
                      key={pair}
                      onClick={() => {
                        setSelectedPair(pair)
                        setPairDropdownOpen(false)
                      }}
                      data-testid={`select-pair-${pair.replace('/', '-').toLowerCase()}`}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.04] transition-colors ${
                        pair === selectedPair ? 'text-[#FFD700] bg-[#FFD700]/[0.05]' : 'text-white/70'
                      }`}
                    >
                      {pair}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Price display */}
          {lastCandle && (
            <div className="flex items-baseline gap-3">
              <span
                className="text-2xl font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                ${formatPrice(lastCandle.close)}
              </span>
              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  isPositive ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {isPositive ? '+' : ''}
                {priceChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setSelectedTimeframe(tf.id)}
              data-testid={`timeframe-${tf.id}`}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedTimeframe === tf.id ? 'text-[#0A0A0F]' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {selectedTimeframe === tf.id && (
                <motion.div
                  layoutId="timeframe-indicator"
                  className="absolute inset-0 rounded-lg bg-[#FFD700]"
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
              )}
              <span className="relative">{tf.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content: Chart + Side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="h-[420px] flex items-center justify-center">
                  <Skeleton className="w-full h-full rounded-2xl" />
                </div>
              ) : (
                <div
                  ref={chartContainerRef}
                  className="w-full h-[420px] rounded-2xl overflow-hidden"
                  data-testid="trading-chart"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side panel: IA signal */}
        <div className="lg:col-span-1 space-y-4">
          {/* Current signal */}
          <Card variant="highlighted">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-orbitron)' }}
                >
                  Signal IA
                </h3>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-50"
                  data-testid="refresh-signal"
                >
                  {analyzing ? (
                    <Loader2 className="h-3.5 w-3.5 text-[#FFD700] animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 text-white/30 hover:text-[#FFD700]" />
                  )}
                </button>
              </div>

              {/* Signal badge */}
              <div className="text-center mb-4">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${signalColors.BUY.bg} ${signalColors.BUY.border}`}
                >
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-lg font-bold text-emerald-400">BUY</span>
                </div>
                <div className="mt-2">
                  <span
                    className="text-2xl font-bold text-[#FFD700]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  >
                    78%
                  </span>
                  <span className="text-xs text-white/40 ml-1">confiance</span>
                </div>
              </div>

              {/* Key levels */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">Entry</span>
                  <span className="text-[var(--text-primary)] font-medium" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    $67,234
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Stop Loss</span>
                  <span className="text-red-400 font-medium" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    $65,800
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Take Profit</span>
                  <span className="text-emerald-400 font-medium" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    $70,500
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">R:R</span>
                  <span className="text-[#FFD700] font-medium" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    1:2.3
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agents breakdown */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-3.5 w-3.5 text-[#FFD700]" />
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Sous-Agents
                </h3>
              </div>

              <div className="space-y-2">
                {SAMPLE_AGENTS.map((agent) => {
                  const colors = signalColors[agent.signal]
                  return (
                    <div
                      key={agent.agent}
                      className="flex items-center justify-between py-1.5"
                      data-testid={`agent-${agent.agent}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{agent.icon}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{agent.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                        >
                          {agent.signal}
                        </span>
                        <span
                          className="text-xs text-white/40 w-8 text-right"
                          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                        >
                          {agent.confidence}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all"
              data-testid="execute-trade"
            >
              <Play className="h-4 w-4" />
              Executer le trade
            </button>
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-sm font-semibold hover:bg-[#FFD700]/20 transition-all"
              data-testid="let-bot-decide"
            >
              <Bot className="h-4 w-4" />
              Laisser le bot decider
            </button>
          </div>
        </div>
      </div>

      {/* Recent signals below chart */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#FFD700]" />
              <h3
                className="text-sm font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-orbitron)' }}
              >
                Signaux recents
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">MIDAS SHIELD actif</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" data-testid="recent-signals-table">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] font-medium text-white/30 uppercase tracking-wider pb-3">Paire</th>
                  <th className="text-center text-[10px] font-medium text-white/30 uppercase tracking-wider pb-3">Signal</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider pb-3">Entry</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider pb-3">SL</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider pb-3">TP</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider pb-3">R:R</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider pb-3">Confiance</th>
                  <th className="text-right text-[10px] font-medium text-white/30 uppercase tracking-wider pb-3 hidden sm:table-cell">Heure</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { pair: 'BTC/USDT', signal: 'BUY' as const, entry: '$67,234', sl: '$65,800', tp: '$70,500', rr: '1:2.3', confidence: 78, time: '14:32' },
                  { pair: 'SOL/USDT', signal: 'BUY' as const, entry: '$178.40', sl: '$172.00', tp: '$190.00', rr: '1:1.8', confidence: 74, time: '14:15' },
                  { pair: 'ETH/USDT', signal: 'HOLD' as const, entry: '-', sl: '-', tp: '-', rr: '-', confidence: 52, time: '14:00' },
                  { pair: 'AVAX/USDT', signal: 'SELL' as const, entry: '$38.67', sl: '$40.20', tp: '$35.00', rr: '1:2.4', confidence: 68, time: '13:45' },
                ].map((row, i) => {
                  const colors = signalColors[row.signal]
                  return (
                    <motion.tr
                      key={row.pair + i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 text-sm font-medium text-[var(--text-primary)]">{row.pair}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {row.signal}
                        </span>
                      </td>
                      <td className="py-3 text-right text-xs text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{row.entry}</td>
                      <td className="py-3 text-right text-xs text-red-400/70" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{row.sl}</td>
                      <td className="py-3 text-right text-xs text-emerald-400/70" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{row.tp}</td>
                      <td className="py-3 text-right text-xs text-[#FFD700]/70" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{row.rr}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`text-xs font-medium ${
                            row.confidence >= 70 ? 'text-emerald-400' : row.confidence >= 60 ? 'text-[#FFD700]' : 'text-white/40'
                          }`}
                          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                        >
                          {row.confidence}%
                        </span>
                      </td>
                      <td className="py-3 text-right text-xs text-white/30 hidden sm:table-cell">{row.time}</td>
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
