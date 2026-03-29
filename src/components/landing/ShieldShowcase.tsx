'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Shield,
  Ban,
  TrendingDown,
  AlertTriangle,
  Clock,
  BarChart2,
  Lock,
} from 'lucide-react'

const shieldLevels = [
  {
    level: 1,
    icon: Ban,
    name: 'Stop-Loss Dynamique',
    description:
      'Ajuste automatiquement les stop-loss en fonction de la volatilite ATR. Protege chaque trade individuellement.',
    color: '#4ADE80',
  },
  {
    level: 2,
    icon: TrendingDown,
    name: 'Anti-Drawdown',
    description:
      'Reduit automatiquement la taille des positions quand le drawdown depasse vos seuils (5%, 10%, 15%).',
    color: '#34D399',
  },
  {
    level: 3,
    icon: AlertTriangle,
    name: 'Detection de Flash Crash',
    description:
      'Detecte les chutes brutales en moins de 60 secondes et liquide les positions exposees instantanement.',
    color: '#FFD700',
  },
  {
    level: 4,
    icon: Clock,
    name: 'Cooldown Automatique',
    description:
      'Apres 3 pertes consecutives, MIDAS se met en pause 4 heures pour eviter le revenge trading.',
    color: '#FBBF24',
  },
  {
    level: 5,
    icon: BarChart2,
    name: 'Decorrelation de Portefeuille',
    description:
      'Empeche la surexposition a des actifs correles. Maximum 30% du capital sur un meme secteur.',
    color: '#F59E0B',
  },
  {
    level: 6,
    icon: Lock,
    name: 'Capital Garanti',
    description:
      'Verrouille un pourcentage de votre capital initial qui ne sera jamais engage en trading.',
    color: '#F97316',
  },
  {
    level: 7,
    icon: Shield,
    name: 'Kill Switch Total',
    description:
      'Arret immediat de toutes les operations en un clic. Toutes les positions sont fermees au marche.',
    color: '#EF4444',
  },
]

function ShieldSVG({ progress }: { progress: number }) {
  return (
    <div className="relative w-48 h-56 sm:w-56 sm:h-64 mx-auto">
      <svg
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Shield outline */}
        <motion.path
          d="M100 20 L170 55 L170 130 C170 175 140 210 100 225 C60 210 30 175 30 130 L30 55 Z"
          stroke="rgba(255, 215, 0, 0.15)"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Shield fill - animated */}
        <motion.path
          d="M100 20 L170 55 L170 130 C170 175 140 210 100 225 C60 210 30 175 30 130 L30 55 Z"
          fill="url(#shieldGradient)"
          initial={{ clipPath: 'inset(100% 0 0 0)' }}
          animate={{ clipPath: `inset(${100 - progress * 100}% 0 0 0)` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        {/* Inner glow */}
        <motion.path
          d="M100 40 L155 65 L155 125 C155 162 132 190 100 202 C68 190 45 162 45 125 L45 65 Z"
          stroke="rgba(255, 215, 0, 0.1)"
          strokeWidth="0.5"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: progress > 0 ? 0.5 : 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        />
        <defs>
          <linearGradient
            id="shieldGradient"
            x1="100"
            y1="225"
            x2="100"
            y2="20"
          >
            <stop offset="0%" stopColor="rgba(255, 215, 0, 0.02)" />
            <stop offset="50%" stopColor="rgba(255, 215, 0, 0.08)" />
            <stop offset="100%" stopColor="rgba(255, 215, 0, 0.15)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl sm:text-5xl font-black font-[family-name:var(--font-orbitron)] gradient-text-gold"
          animate={{ opacity: progress > 0 ? 1 : 0.3 }}
        >
          {Math.round(progress * 7)}
        </motion.span>
        <span className="text-xs text-white/40 font-[family-name:var(--font-orbitron)]">
          / 7
        </span>
      </div>

      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          boxShadow:
            progress > 0.5
              ? '0 0 80px rgba(255, 215, 0, 0.1)'
              : '0 0 0px rgba(255, 215, 0, 0)',
        }}
        transition={{ duration: 1 }}
        style={{ borderRadius: '50%' }}
      />
    </div>
  )
}

function LevelItem({
  level,
  index,
  isActive,
}: {
  level: (typeof shieldLevels)[number]
  index: number
  isActive: boolean
}) {
  const Icon = level.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0.3, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.12 }}
      className="flex items-start gap-4 py-3"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
        style={{
          background: isActive ? `${level.color}20` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isActive ? `${level.color}40` : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        <Icon
          className="w-4 h-4 transition-colors duration-300"
          style={{ color: isActive ? level.color : 'rgba(255,255,255,0.2)' }}
        />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold font-[family-name:var(--font-orbitron)] px-1.5 py-0.5 rounded transition-all duration-300"
            style={{
              background: isActive ? `${level.color}15` : 'transparent',
              color: isActive ? level.color : 'rgba(255,255,255,0.3)',
            }}
          >
            LV.{level.level}
          </span>
          <h4
            className="text-sm font-semibold transition-colors duration-300"
            style={{ color: isActive ? '#F8FAFC' : 'rgba(248,250,252,0.3)' }}
          >
            {level.name}
          </h4>
        </div>
        <p
          className="text-xs leading-relaxed mt-1 transition-colors duration-300"
          style={{
            color: isActive
              ? 'rgba(248,250,252,0.5)'
              : 'rgba(248,250,252,0.15)',
          }}
        >
          {level.description}
        </p>
      </div>
    </motion.div>
  )
}

export default function ShieldShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  const progress = isInView ? 1 : 0

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-4 sm:px-6"
      data-testid="shield-showcase-section"
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
            MIDAS Shield
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-orbitron)]">
            7 niveaux de{' '}
            <span className="gradient-text-gold">protection</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-2xl mx-auto text-base sm:text-lg">
            Votre capital est sacre. MIDAS Shield empile 7 couches de defense
            pour que vous ne perdiez jamais plus que ce que vous avez decide.
          </p>
        </motion.div>

        {/* Content: shield visual + levels list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Shield SVG */}
          <div className="flex justify-center">
            <ShieldSVG progress={progress} />
          </div>

          {/* Right: Levels list */}
          <div className="space-y-1">
            {shieldLevels.map((level, i) => (
              <LevelItem
                key={level.level}
                level={level}
                index={i}
                isActive={isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
