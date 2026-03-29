'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Shield, Zap } from 'lucide-react'

interface StepWelcomeProps {
  onNext: () => void
}

const features = [
  {
    icon: TrendingUp,
    title: 'Analyse IA',
    description: 'Signaux de trading en temps reel generes par notre IA',
  },
  {
    icon: Shield,
    title: 'Gestion du risque',
    description: 'Protection automatisee de votre capital',
  },
  {
    icon: Zap,
    title: 'Execution rapide',
    description: 'Connexion directe a vos exchanges favoris',
  },
]

export default function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-center max-w-lg mx-auto"
    >
      {/* Animated logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-8"
      >
        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FFD700]/20 to-[#B8860B]/10 border border-[#FFD700]/20 animate-pulse-glow">
          <span
            className="text-4xl font-bold gradient-text-gold-animated"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            M
          </span>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-2xl font-bold text-[var(--text-primary)] mb-3"
        style={{ fontFamily: 'var(--font-orbitron)' }}
        data-testid="welcome-title"
      >
        Bienvenue sur MIDAS
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-[var(--text-secondary)] mb-10 leading-relaxed"
      >
        Votre assistant de trading propulse par l&apos;intelligence artificielle.
        Configurons votre experience en quelques etapes.
      </motion.p>

      <div className="grid gap-4 mb-10">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
              <feature.icon className="h-5 w-5 text-[#FFD700]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{feature.title}</p>
              <p className="text-xs text-[var(--text-secondary)]">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={onNext}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        data-testid="welcome-next"
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:brightness-110 transition-all"
      >
        Commencer la configuration
      </motion.button>
    </motion.div>
  )
}
