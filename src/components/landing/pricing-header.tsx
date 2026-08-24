'use client'

import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'

interface PricingHeaderProps {
  isInView: boolean
  isMaxPlan: boolean
  isAuthenticated: boolean
  isYearly: boolean
  onToggleYearly: () => void
}

export function PricingHeader({ isInView, isMaxPlan, isAuthenticated, isYearly, onToggleYearly }: PricingHeaderProps) {
  return (
    <>
      {/* Financement banner */}
      <motion.a
        href="/financer"
        initial={{ opacity: 0, y: -10 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center gap-3 mb-8 px-6 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 max-w-2xl mx-auto hover:bg-emerald-500/15 transition-all group cursor-pointer"
      >
        <span className="text-lg">💰</span>
        <p className="text-emerald-300 text-sm font-medium">
          La plupart de nos clients ne paient rien grace aux aides.{' '}
          <span className="underline underline-offset-2 group-hover:text-emerald-200 transition-colors">
            Verifier mon eligibilite →
          </span>
        </p>
      </motion.a>

      {/* Super admin banner */}
      {isMaxPlan && isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-8 px-6 py-3 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 max-w-lg mx-auto"
        >
          <ShieldCheck className="w-5 h-5 text-[#FFD700] shrink-0" />
          <p className="text-[#FFD700] text-sm font-semibold font-[var(--font-dm-sans)]">
            Tu es deja sur le plan maximum
          </p>
        </motion.div>
      )}

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <span className="inline-block px-4 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-xs font-semibold tracking-wider uppercase mb-4 font-[var(--font-orbitron)]">
          Tarifs
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 font-[var(--font-orbitron)]">
          Un plan pour chaque trader
        </h2>
        <p className="text-white/50 text-lg max-w-2xl mx-auto font-[var(--font-dm-sans)]">
          Commencez gratuitement, evoluez quand vous etes pret.
        </p>
      </motion.div>

      {/* Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="flex items-center justify-center gap-4 mb-16"
      >
        <span
          className={`text-sm font-medium transition-colors ${
            !isYearly ? 'text-white' : 'text-white/40'
          } font-[var(--font-dm-sans)]`}
        >
          Mensuel
        </span>
        <button
          type="button"
          onClick={onToggleYearly}
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
            isYearly
              ? 'bg-[#FFD700]/20 border-[#FFD700]/40'
              : 'bg-white/10 border-white/10'
          } border`}
          data-testid="billing-toggle"
          aria-label="Basculer entre mensuel et annuel"
        >
          <motion.div
            className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[#FFD700] shadow-lg shadow-[#FFD700]/30"
            animate={{ x: isYearly ? 28 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
        <span
          className={`text-sm font-medium transition-colors ${
            isYearly ? 'text-white' : 'text-white/40'
          } font-[var(--font-dm-sans)]`}
        >
          Annuel
        </span>
        {isYearly && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-2.5 py-1 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 text-[#FFD700] text-xs font-bold font-[var(--font-orbitron)]"
          >
            -33%
          </motion.span>
        )}
      </motion.div>
    </>
  )
}
