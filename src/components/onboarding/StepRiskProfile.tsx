'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Shield, TrendingUp, Flame } from 'lucide-react'

interface StepRiskProfileProps {
  initialValue?: number
  onNext: (riskLevel: number) => void
  onSkip: () => void
}

const riskLevels = [
  {
    level: 0,
    label: 'Tres Conservateur',
    icon: ShieldCheck,
    color: '#10B981',
    description:
      'Priorite a la preservation du capital. Trades a faible risque uniquement, pertes maximales limitees a 1-2% par position.',
  },
  {
    level: 1,
    label: 'Conservateur',
    icon: Shield,
    color: '#3B82F6',
    description:
      'Approche equilibree avec un biais defensif. Risque modere de 2-5% par position, focus sur les actifs etablis.',
  },
  {
    level: 2,
    label: 'Modere',
    icon: TrendingUp,
    color: '#F59E0B',
    description:
      'Equilibre entre risque et rendement. Positions de 5-10% du portefeuille, diversification sur plusieurs actifs.',
  },
  {
    level: 3,
    label: 'Agressif',
    icon: Flame,
    color: '#EF4444',
    description:
      'Rendements maximaux avec un risque eleve. Positions concentrees, leverage possible, strategies court terme.',
  },
]

export default function StepRiskProfile({ initialValue = 1, onNext, onSkip }: StepRiskProfileProps) {
  const [selected, setSelected] = useState(initialValue)
  const current = riskLevels[selected]

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-bold text-[var(--text-primary)] mb-2"
          style={{ fontFamily: 'var(--font-orbitron)' }}
          data-testid="risk-title"
        >
          Profil de risque
        </h2>
        <p className="text-[var(--text-secondary)] text-sm">
          Definissez votre tolerance au risque pour des signaux adaptes
        </p>
      </div>

      {/* Risk level cards */}
      <div className="space-y-3 mb-8">
        {riskLevels.map((risk, i) => {
          const isSelected = selected === i
          const Icon = risk.icon
          return (
            <motion.button
              key={risk.level}
              onClick={() => setSelected(i)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileTap={{ scale: 0.98 }}
              data-testid={`risk-level-${risk.level}`}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-[var(--border-strong)] bg-white/[0.06] shadow-[0_0_20px_rgba(255,215,0,0.08)]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${risk.color}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: risk.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {risk.label}
                    </span>
                    {isSelected && (
                      <motion.div
                        layoutId="risk-check"
                        className="w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center"
                      >
                        <svg className="w-3 h-3 text-[#0A0A0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {risk.description}
                  </p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Visual risk indicator */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mb-2">
          <span>Faible risque</span>
          <span>Risque eleve</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            animate={{
              width: `${((selected + 1) / riskLevels.length) * 100}%`,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              background: `linear-gradient(90deg, #10B981, ${current?.color ?? '#F59E0B'})`,
            }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          data-testid="risk-skip"
          className="flex-1 py-3 rounded-xl border border-white/[0.08] text-[var(--text-secondary)] text-sm hover:bg-white/[0.04] transition-all"
        >
          Passer
        </button>
        <motion.button
          onClick={() => onNext(selected)}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          data-testid="risk-next"
          className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:brightness-110 transition-all"
        >
          Continuer
        </motion.button>
      </div>
    </motion.div>
  )
}
