'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp, TrendingDown, Sparkles, ShieldCheck, Zap, Bot, Activity } from 'lucide-react'

type Ticker = { symbol: string; price: string; change: number }

const tickers: Ticker[] = [
  { symbol: 'BTC', price: '68 420.18', change: 2.41 },
  { symbol: 'ETH', price: '3 512.88', change: 1.87 },
  { symbol: 'SOL', price: '182.45', change: 4.12 },
  { symbol: 'BNB', price: '612.33', change: -0.48 },
  { symbol: 'XRP', price: '0.5821', change: 0.96 },
  { symbol: 'AVAX', price: '38.22', change: -1.14 },
  { symbol: 'LINK', price: '17.04', change: 3.28 },
  { symbol: 'ADA', price: '0.4715', change: 1.22 },
]

function GoldOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-15%] left-[15%] w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.14)_0%,transparent_70%)] blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(184,134,11,0.10)_0%,transparent_70%)] blur-3xl"
      />
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[40%] right-[30%] w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_70%)] blur-3xl"
      />
    </div>
  )
}

function TickerMarquee() {
  return (
    <div className="relative overflow-hidden py-3 border-y border-white/[0.06] bg-white/[0.015] backdrop-blur-sm">
      <div className="flex gap-8 animate-[ticker-scroll_40s_linear_infinite]" style={{ width: 'max-content' }}>
        {[...tickers, ...tickers, ...tickers].map((t, i) => {
          const up = t.change >= 0
          return (
            <div key={i} className="flex items-center gap-2.5 whitespace-nowrap px-1">
              <span className="text-xs font-semibold tracking-wider text-white/50 font-mono">{t.symbol}</span>
              <span className="text-sm font-semibold text-white tabular-nums font-mono">${t.price}</span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
                  up ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {up ? '+' : ''}
                {t.change.toFixed(2)}%
              </span>
              <span className="w-px h-4 bg-white/10 ml-4" />
            </div>
          )
        })}
      </div>
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#06080F] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#06080F] to-transparent pointer-events-none" />
    </div>
  )
}

function Sparkline({ color = '#FFD700', trend = 'up' }: { color?: string; trend?: 'up' | 'down' }) {
  const points =
    trend === 'up'
      ? '0,28 10,24 20,26 30,20 40,22 50,16 60,18 70,12 80,14 90,8 100,10'
      : '0,10 10,14 20,12 30,18 40,16 50,22 60,20 70,26 80,24 90,28 100,30'
  return (
    <svg viewBox="0 0 100 32" className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${trend}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`${points} 100,32 0,32`} fill={`url(#grad-${trend})`} />
    </svg>
  )
}

function DeviceMockup() {
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const id = setInterval(() => setTyping((v) => !v), 2800)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: -8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: '1200px' }}
      className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px]"
    >
      {/* Glow halo */}
      <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.18)_0%,transparent_60%)] blur-2xl pointer-events-none" />

      {/* Phone frame */}
      <div className="relative rounded-[44px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-[3px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_rgba(255,215,0,0.08)]">
        <div className="relative rounded-[42px] bg-[#0A0C16] p-2 border border-white/[0.06]">
          <div className="relative rounded-[34px] bg-gradient-to-b from-[#0E1220] to-[#06080F] overflow-hidden">
            {/* Dynamic island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-black z-20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/60" />
            </div>

            {/* Status bar */}
            <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[10px] font-semibold text-white/70 tabular-nums">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-[1px] border border-white/60" />
                <span>100</span>
              </span>
            </div>

            {/* App content */}
            <div className="px-4 pt-4 pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Portfolio</div>
                  <div className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)] tabular-nums">
                    $24 812<span className="text-white/40 text-base">.44</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] flex items-center justify-center shadow-lg shadow-[#FFD700]/30">
                  <Bot className="w-5 h-5 text-[#06080F]" />
                </div>
              </div>

              {/* Chart card */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-semibold text-white/60">24H</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 tabular-nums">+$412.18 · +1.69%</span>
                </div>
                <Sparkline color="#10B981" trend="up" />
              </div>

              {/* Agent signal */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="rounded-2xl bg-gradient-to-br from-[#FFD700]/10 to-transparent border border-[#FFD700]/20 p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span className="text-[10px] font-bold tracking-widest text-[#FFD700] uppercase">Signal IA</span>
                  <span className="ml-auto text-[9px] text-white/40">à l&apos;instant</span>
                </div>
                <div className="text-[11px] text-white leading-snug">
                  Breakout confirmé sur <span className="font-semibold text-[#FFD700]">SOL</span> — volume x2.4, RSI 62.{' '}
                  <span className="text-white/60">Entrée suggérée avec stop-loss à -1.8%.</span>
                </div>
              </motion.div>

              {/* Positions */}
              <div className="space-y-2">
                {[
                  { sym: 'BTC', name: 'Bitcoin', amt: '0.148', val: '+2.41%', up: true },
                  { sym: 'ETH', name: 'Ethereum', amt: '2.104', val: '+1.87%', up: true },
                  { sym: 'SOL', name: 'Solana', amt: '18.42', val: '+4.12%', up: true },
                ].map((p) => (
                  <div
                    key={p.sym}
                    className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#B8860B]/10 flex items-center justify-center text-[9px] font-bold text-[#FFD700] font-mono">
                        {p.sym}
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-white">{p.name}</div>
                        <div className="text-[9px] text-white/40 font-mono">{p.amt} {p.sym}</div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold tabular-nums ${p.up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chat input */}
              <div className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD700] flex-shrink-0" />
                <div className="text-[11px] text-white/50 truncate">
                  {typing ? 'MIDAS analyse le marché…' : 'Demande à MIDAS…'}
                </div>
                {typing && (
                  <div className="flex gap-0.5 ml-auto">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                        className="w-1 h-1 rounded-full bg-[#FFD700]"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Home indicator */}
              <div className="flex justify-center pt-1">
                <div className="w-24 h-1 rounded-full bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating glass card left */}
      <motion.div
        initial={{ opacity: 0, x: -20, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="hidden md:flex absolute -left-20 top-1/3 items-center gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl px-4 py-3 shadow-2xl"
      >
        <div className="w-9 h-9 rounded-full bg-emerald-400/15 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">SHIELD actif</div>
          <div className="text-xs text-white font-semibold">Niveau 5 · Capital protégé</div>
        </div>
      </motion.div>

      {/* Floating glass card right */}
      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="hidden md:flex absolute -right-16 top-20 items-center gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl px-4 py-3 shadow-2xl"
      >
        <div className="w-9 h-9 rounded-full bg-[#FFD700]/15 flex items-center justify-center">
          <Activity className="w-4 h-4 text-[#FFD700]" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">6 Agents IA</div>
          <div className="text-xs text-white font-semibold">Analyse 24/7 · En ligne</div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      data-testid="hero-section"
    >
      <div className="absolute inset-0 bg-midas-gradient" />
      <div className="absolute inset-0 bg-grid opacity-30" />
      <GoldOrbs />

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-6 pt-28 pb-16 lg:pt-32">
          <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
            {/* Left — copy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl mb-8"
              >
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-[#FFD700] animate-ping opacity-60" />
                  <span className="relative w-2 h-2 rounded-full bg-[#FFD700]" />
                </span>
                <span className="text-xs font-semibold text-white/80">Nouvelle génération · Trading IA</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="font-[family-name:var(--font-orbitron)] text-[44px] sm:text-6xl lg:text-7xl xl:text-[88px] font-black leading-[0.95] tracking-tight mb-6"
              >
                <span className="block text-white">Transforme tes</span>
                <span className="block gradient-text-gold-animated drop-shadow-[0_0_40px_rgba(255,215,0,0.3)]">
                  trades en or.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.35 }}
                className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
              >
                6 agents IA analysent les marchés crypto 24/7.
                Signaux, sentiment, on-chain, gestion du risque — <span className="text-white/90 font-medium">tu dors, MIDAS travaille</span>.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10"
              >
                <a
                  href="/register"
                  data-testid="cta-signup"
                  className="group relative inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-b from-[#FFE44D] to-[#FFD700] text-[#06080F] font-bold text-base shadow-[0_10px_30px_-5px_rgba(255,215,0,0.5),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_15px_40px_-5px_rgba(255,215,0,0.7)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a
                  href="/pricing"
                  data-testid="cta-pricing"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.10] text-white font-semibold text-base backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/[0.20] transition-all duration-300"
                >
                  Voir les plans
                </a>
              </motion.div>

              {/* Trust row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-xs text-white/40"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" />
                  Clés API read-only
                </div>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <div>Sans carte bancaire</div>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <div>Binance · Kraken · Bybit</div>
              </motion.div>
            </motion.div>

            {/* Right — device mockup */}
            <div className="flex justify-center lg:justify-end">
              <DeviceMockup />
            </div>
          </div>
        </div>

        {/* Ticker */}
        <TickerMarquee />
      </div>

      <div className="absolute bottom-14 left-0 right-0 h-24 bg-gradient-to-t from-[#06080F] to-transparent pointer-events-none" />
    </section>
  )
}
