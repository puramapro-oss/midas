'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  BarChart3,
  MessageSquare,
  Blocks,
  CalendarClock,
  Fingerprint,
  ShieldAlert,
  Brain,
} from 'lucide-react'

const agents = [
  {
    icon: BarChart3,
    name: 'Agent Technique',
    description:
      '47 indicateurs (RSI, MACD, Bollinger, Ichimoku...) analyses en temps reel sur 9 timeframes.',
    color: '#FFD700',
  },
  {
    icon: MessageSquare,
    name: 'Agent Sentiment',
    description:
      'Analyse X/Twitter, Reddit, news et Fear & Greed Index pour capter le mood du marche.',
    color: '#FFC107',
  },
  {
    icon: Blocks,
    name: 'Agent On-Chain',
    description:
      'Mouvements de whales, flux exchanges, activite reseau et metriques blockchain en direct.',
    color: '#FFB300',
  },
  {
    icon: CalendarClock,
    name: 'Agent Calendrier',
    description:
      'Unlocks de tokens, annonces Fed, earnings, forks et evenements macro qui impactent les cours.',
    color: '#FFA000',
  },
  {
    icon: Fingerprint,
    name: 'Agent Pattern',
    description:
      'Detection de figures chartistes (H&S, triangles, wedges) et harmonics par vision IA avancee.',
    color: '#FF8F00',
  },
  {
    icon: ShieldAlert,
    name: 'Agent Risque',
    description:
      'Calcul dynamique de position sizing, stop-loss, take-profit et correlation de portefeuille.',
    color: '#FF6F00',
  },
]

function AgentCard({
  agent,
  index,
}: {
  agent: (typeof agents)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const Icon = agent.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={
        isInView
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 30, scale: 0.95 }
      }
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative group"
    >
      <div className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl hover:border-[#FFD700]/20 hover:bg-white/[0.05] transition-all duration-300">
        {/* Glow effect on hover */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${agent.color}08, transparent 70%)`,
          }}
        />

        <div className="relative flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `${agent.color}15`,
              border: `1px solid ${agent.color}30`,
            }}
          >
            <Icon className="w-5 h-5" style={{ color: agent.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1 font-[family-name:var(--font-dm-sans)]">
              {agent.name}
            </h3>
            <p className="text-xs text-white/45 leading-relaxed">
              {agent.description}
            </p>
          </div>
        </div>

        {/* Connection line to center (visible on lg) */}
        <div className="hidden lg:block absolute -right-3 top-1/2 w-3 h-px bg-gradient-to-r from-white/10 to-transparent group-hover:from-[#FFD700]/30 transition-colors" />
      </div>
    </motion.div>
  )
}

export default function AILayers() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-4 sm:px-6"
      data-testid="ai-layers-section"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[#FFD700]/70 mb-3 block font-[family-name:var(--font-orbitron)]">
            Intelligence Artificielle
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-orbitron)]">
            6 agents IA,{' '}
            <span className="gradient-text-gold">1 coordinateur</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-2xl mx-auto text-base sm:text-lg">
            Chaque agent est specialise dans un domaine. Le coordinateur central
            fusionne leurs analyses pour des decisions de trading optimales.
          </p>
        </motion.div>

        {/* Layout: agents grid + central coordinator */}
        <div className="relative">
          {/* Agent cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {agents.map((agent, i) => (
              <AgentCard key={agent.name} agent={agent} index={i} />
            ))}
          </div>

          {/* Coordinator card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={
              isInView
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.8 }
            }
            transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
            className="mt-8 mx-auto max-w-md"
          >
            <div className="relative p-6 rounded-2xl bg-[#FFD700]/[0.04] border border-[#FFD700]/20 backdrop-blur-xl text-center shadow-[0_0_60px_rgba(255,215,0,0.06)]">
              {/* Animated ring */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="absolute -inset-[1px] rounded-2xl"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0%, #FFD70040 25%, transparent 50%)',
                  }}
                />
                <div className="absolute inset-[1px] rounded-2xl bg-[#06080F]" />
              </div>

              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-[#FFD700]/15 border border-[#FFD700]/30 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-7 h-7 text-[#FFD700]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 font-[family-name:var(--font-orbitron)]">
                  Coordinateur MIDAS
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Fusionne les signaux des 6 agents, calcule un score de
                  confiance global et prend la decision finale : acheter, vendre
                  ou attendre. Chaque trade est explique en langage clair.
                </p>

                {/* Connection dots */}
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {agents.map((a, i) => (
                    <motion.div
                      key={a.name}
                      animate={{
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: i * 0.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: a.color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
