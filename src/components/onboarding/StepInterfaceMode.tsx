'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Code2, BarChart3, LineChart, Gauge, Bot } from 'lucide-react'

interface StepInterfaceModeProps {
  initialValue?: 'simple' | 'expert'
  onNext: (mode: 'simple' | 'expert') => void
  onSkip: () => void
}

const modes = [
  {
    id: 'simple' as const,
    title: 'Simple',
    subtitle: 'Recommande pour les debutants',
    description:
      'Interface epuree avec signaux clairs, widgets essentiels et assistance IA guidee. Ideal pour commencer le trading.',
    icon: LayoutDashboard,
    features: ['Signaux simplifies', 'Widgets essentiels', 'Assistance IA guidee', 'Graphiques de base'],
    previewIcons: [BarChart3, Bot],
  },
  {
    id: 'expert' as const,
    title: 'Expert',
    subtitle: 'Pour les traders experimentes',
    description:
      'Tous les outils avances : indicateurs techniques, ordres complexes, analyse multi-timeframe et strategies personnalisees.',
    icon: Code2,
    features: ['Indicateurs avances', 'Ordres complexes', 'Multi-timeframe', 'Strategies custom'],
    previewIcons: [LineChart, Gauge],
  },
]

export default function StepInterfaceMode({ initialValue = 'simple', onNext, onSkip }: StepInterfaceModeProps) {
  const [selected, setSelected] = useState<'simple' | 'expert'>(initialValue)

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
          data-testid="interface-title"
        >
          Mode d&apos;interface
        </h2>
        <p className="text-[var(--text-secondary)] text-sm">
          Choisissez l&apos;experience qui vous correspond
        </p>
      </div>

      <div className="grid gap-4 mb-8">
        {modes.map((mode, i) => {
          const isSelected = selected === mode.id
          const Icon = mode.icon
          return (
            <motion.button
              key={mode.id}
              onClick={() => setSelected(mode.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              whileTap={{ scale: 0.98 }}
              data-testid={`mode-${mode.id}`}
              className={`relative w-full text-left p-5 rounded-xl border transition-all ${
                isSelected
                  ? 'border-[#FFD700]/40 bg-[#FFD700]/[0.05] shadow-[0_0_25px_rgba(255,215,0,0.08)]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="mode-indicator"
                  className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center"
                >
                  <svg className="w-3.5 h-3.5 text-[#0A0A0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#FFD700]/20'
                      : 'bg-white/[0.04]'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 transition-colors ${
                      isSelected ? 'text-[#FFD700]' : 'text-[var(--text-secondary)]'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-base font-semibold text-[var(--text-primary)]">
                      {mode.title}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">{mode.subtitle}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                    {mode.description}
                  </p>

                  {/* Preview mockup */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    {mode.previewIcons.map((PIcon, j) => (
                      <div
                        key={j}
                        className="w-8 h-8 rounded-md bg-white/[0.04] flex items-center justify-center"
                      >
                        <PIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
                      </div>
                    ))}
                    <div className="flex-1 space-y-1.5">
                      <div className="h-1.5 rounded-full bg-white/[0.06] w-full" />
                      <div className="h-1.5 rounded-full bg-white/[0.04] w-3/4" />
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {mode.features.map((f) => (
                      <span
                        key={f}
                        className={`text-[10px] px-2 py-0.5 rounded-md border ${
                          isSelected
                            ? 'border-[#FFD700]/20 text-[#FFD700]/80 bg-[#FFD700]/[0.06]'
                            : 'border-white/[0.06] text-[var(--text-tertiary)] bg-white/[0.02]'
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          data-testid="interface-skip"
          className="flex-1 py-3 rounded-xl border border-white/[0.08] text-[var(--text-secondary)] text-sm hover:bg-white/[0.04] transition-all"
        >
          Passer
        </button>
        <motion.button
          onClick={() => onNext(selected)}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          data-testid="interface-next"
          className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:brightness-110 transition-all"
        >
          Continuer
        </motion.button>
      </div>
    </motion.div>
  )
}
