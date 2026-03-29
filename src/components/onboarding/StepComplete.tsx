'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Shield, Plug, LayoutDashboard, Code2, Sparkles } from 'lucide-react'

interface OnboardingData {
  riskLevel: number | null
  exchange: string | null
  interfaceMode: 'simple' | 'expert'
}

interface StepCompleteProps {
  data: OnboardingData
  onFinish: () => void
  loading: boolean
}

const riskLabels = ['Tres Conservateur', 'Conservateur', 'Modere', 'Agressif']
const riskColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']

export default function StepComplete({ data, onFinish, loading }: StepCompleteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-lg mx-auto text-center"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-8 inline-flex"
      >
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#B8860B]/10 border border-[#FFD700]/30 flex items-center justify-center animate-pulse-glow">
          <Sparkles className="h-10 w-10 text-[#FFD700]" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-2xl font-bold text-[var(--text-primary)] mb-2"
        style={{ fontFamily: 'var(--font-orbitron)' }}
        data-testid="complete-title"
      >
        Configuration terminee
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-[var(--text-secondary)] text-sm mb-8"
      >
        Votre assistant MIDAS est pret. Voici un resume de vos choix :
      </motion.p>

      {/* Summary cards */}
      <div className="space-y-3 mb-10 text-left">
        {/* Risk profile */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
        >
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background:
                data.riskLevel !== null
                  ? `${riskColors[data.riskLevel]}15`
                  : 'rgba(255,255,255,0.04)',
            }}
          >
            <Shield
              className="h-5 w-5"
              style={{
                color: data.riskLevel !== null ? riskColors[data.riskLevel] : 'var(--text-tertiary)',
              }}
            />
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">Profil de risque</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {data.riskLevel !== null ? riskLabels[data.riskLevel] : 'Non defini'}
            </p>
          </div>
        </motion.div>

        {/* Exchange */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Plug className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">Exchange</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {data.exchange
                ? data.exchange.charAt(0).toUpperCase() + data.exchange.slice(1)
                : 'Non connecte'}
            </p>
          </div>
        </motion.div>

        {/* Interface mode */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
            {data.interfaceMode === 'expert' ? (
              <Code2 className="h-5 w-5 text-[#FFD700]" />
            ) : (
              <LayoutDashboard className="h-5 w-5 text-[#FFD700]" />
            )}
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">Interface</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Mode {data.interfaceMode === 'expert' ? 'Expert' : 'Simple'}
            </p>
          </div>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-xs text-[var(--text-tertiary)] mb-6"
      >
        Vous pourrez modifier ces parametres a tout moment dans vos reglages.
      </motion.p>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={onFinish}
        disabled={loading}
        whileTap={loading ? undefined : { scale: 0.97 }}
        whileHover={loading ? undefined : { scale: 1.02 }}
        data-testid="complete-finish"
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        Acceder a mon Dashboard
        <ArrowRight className="h-4 w-4" />
      </motion.button>
    </motion.div>
  )
}
