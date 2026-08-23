'use client'

import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react'
import DeviceMockup from './DeviceMockup'

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
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
                transition={{ duration: 0.4, delay: 0 }}
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
