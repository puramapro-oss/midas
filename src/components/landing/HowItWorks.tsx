'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { UserPlus, Link, Shield, Zap } from 'lucide-react'

const steps = [
  {
    icon: UserPlus,
    title: 'Creez votre compte gratuit',
    description:
      'Inscription en 30 secondes. Aucune carte bancaire requise. Acces immediat au dashboard et aux analyses de base.',
  },
  {
    icon: Link,
    title: 'Connectez votre exchange',
    description:
      'Liez Binance, Kraken, Bybit ou tout autre exchange via des cles API en lecture seule. Vos fonds restent sur votre exchange.',
  },
  {
    icon: Shield,
    title: 'Choisissez votre profil de risque',
    description:
      'Conservateur, modere ou agressif. MIDAS adapte ses strategies, ses tailles de position et ses niveaux de stop-loss a votre tolerance.',
  },
  {
    icon: Zap,
    title: 'MIDAS trade pour vous 24/7',
    description:
      'Nos 6 agents IA analysent les marches en continu, executent les trades optimaux et protegent votre capital automatiquement.',
  },
]

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const Icon = step.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: 'easeOut' }}
      className="relative flex flex-col items-center text-center"
    >
      {/* Step number */}
      <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center">
        <span className="text-xs font-bold font-[family-name:var(--font-orbitron)] text-[#FFD700]">
          {index + 1}
        </span>
      </div>

      {/* Icon circle */}
      <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
        <Icon className="w-7 h-7 text-[#FFD700]" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-white mb-2 font-[family-name:var(--font-dm-sans)]">
        {step.title}
      </h3>
      <p className="text-sm text-white/50 leading-relaxed max-w-[260px]">
        {step.description}
      </p>
    </motion.div>
  )
}

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-4 sm:px-6"
      data-testid="how-it-works-section"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[#FFD700]/70 mb-3 block font-[family-name:var(--font-orbitron)]">
            Comment ca marche
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-orbitron)]">
            4 etapes vers le{' '}
            <span className="gradient-text-gold">trading autonome</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto text-base sm:text-lg">
            De l&apos;inscription au trading automatise en moins de 5 minutes.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-8 left-[calc(12.5%+32px)] right-[calc(12.5%+32px)] h-px">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-[#FFD700]/0 via-[#FFD700]/30 to-[#FFD700]/0 origin-left"
            />
            {/* Animated glow dot */}
            <motion.div
              initial={{ left: '0%', opacity: 0 }}
              animate={
                isInView
                  ? { left: ['0%', '100%'], opacity: [0, 1, 1, 0] }
                  : { left: '0%', opacity: 0 }
              }
              transition={{
                duration: 2,
                delay: 0.8,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: 2,
              }}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.6)]"
            />
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
            {steps.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
