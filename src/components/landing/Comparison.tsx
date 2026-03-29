'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, X, Minus } from 'lucide-react'

type CellValue = boolean | string

interface CompetitorRow {
  feature: string
  midas: CellValue
  threeCommas: CellValue
  cryptohopper: CellValue
  pionex: CellValue
}

const comparisonData: CompetitorRow[] = [
  {
    feature: 'Prix mensuel',
    midas: 'Des 0 EUR',
    threeCommas: 'Des 29 EUR',
    cryptohopper: 'Des 24 EUR',
    pionex: 'Gratuit*',
  },
  {
    feature: 'IA integree',
    midas: true,
    threeCommas: false,
    cryptohopper: false,
    pionex: false,
  },
  {
    feature: 'Indicateurs techniques',
    midas: '47',
    threeCommas: '20+',
    cryptohopper: '30+',
    pionex: '15',
  },
  {
    feature: 'Protection multi-niveaux',
    midas: '7 niveaux',
    threeCommas: 'Stop-loss',
    cryptohopper: 'Stop-loss',
    pionex: 'Stop-loss',
  },
  {
    feature: 'Chat expert IA',
    midas: true,
    threeCommas: false,
    cryptohopper: false,
    pionex: false,
  },
  {
    feature: 'Analyse sentiment',
    midas: true,
    threeCommas: false,
    cryptohopper: false,
    pionex: false,
  },
  {
    feature: 'Analyse on-chain',
    midas: true,
    threeCommas: false,
    cryptohopper: false,
    pionex: false,
  },
  {
    feature: 'Calendrier macro',
    midas: true,
    threeCommas: false,
    cryptohopper: true,
    pionex: false,
  },
  {
    feature: 'Detection de patterns',
    midas: true,
    threeCommas: false,
    cryptohopper: false,
    pionex: false,
  },
  {
    feature: 'Backtesting IA',
    midas: true,
    threeCommas: true,
    cryptohopper: true,
    pionex: false,
  },
  {
    feature: 'Nombre d\'exchanges',
    midas: '15+',
    threeCommas: '18+',
    cryptohopper: '15+',
    pionex: '1',
  },
  {
    feature: 'Support francais 24/7',
    midas: true,
    threeCommas: false,
    cryptohopper: false,
    pionex: false,
  },
]

const competitors = [
  { key: 'midas' as const, name: 'MIDAS', highlight: true },
  { key: 'threeCommas' as const, name: '3Commas', highlight: false },
  { key: 'cryptohopper' as const, name: 'Cryptohopper', highlight: false },
  { key: 'pionex' as const, name: 'Pionex', highlight: false },
]

function CellContent({
  value,
  isMidas,
}: {
  value: CellValue
  isMidas: boolean
}) {
  if (typeof value === 'boolean') {
    return value ? (
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto ${isMidas ? 'bg-[#FFD700]/20' : 'bg-white/5'}`}
      >
        <Check
          className={`w-3.5 h-3.5 ${isMidas ? 'text-[#FFD700]' : 'text-green-400/70'}`}
        />
      </div>
    ) : (
      <div className="w-6 h-6 rounded-full flex items-center justify-center mx-auto bg-white/[0.03]">
        <X className="w-3.5 h-3.5 text-white/20" />
      </div>
    )
  }

  return (
    <span
      className={`text-sm ${isMidas ? 'text-[#FFD700] font-semibold' : 'text-white/60'}`}
    >
      {value}
    </span>
  )
}

export default function Comparison() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-4 sm:px-6"
      data-testid="comparison-section"
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
            Comparaison
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-orbitron)]">
            MIDAS vs la{' '}
            <span className="gradient-text-gold">concurrence</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto text-base sm:text-lg">
            Comparez objectivement les fonctionnalites et voyez pourquoi MIDAS
            est un cran au-dessus.
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="overflow-x-auto -mx-4 sm:mx-0"
        >
          <div className="min-w-[640px] px-4 sm:px-0">
            {/* Header row */}
            <div className="grid grid-cols-5 gap-px mb-2">
              <div className="p-3" />
              {competitors.map((c) => (
                <div
                  key={c.key}
                  className={`p-3 text-center rounded-t-xl ${c.highlight ? 'bg-[#FFD700]/[0.06] border-t border-x border-[#FFD700]/20' : ''}`}
                >
                  <span
                    className={`text-sm font-bold ${c.highlight ? 'font-[family-name:var(--font-orbitron)] gradient-text-gold text-base' : 'text-white/60'}`}
                  >
                    {c.name}
                  </span>
                  {c.highlight && (
                    <div className="mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD700]/15 text-[#FFD700] font-medium">
                        Recommande
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {comparisonData.map((row, i) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                className={`grid grid-cols-5 gap-px ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
              >
                <div className="p-3 flex items-center">
                  <span className="text-sm text-white/70">{row.feature}</span>
                </div>
                {competitors.map((c) => (
                  <div
                    key={c.key}
                    className={`p-3 flex items-center justify-center ${c.highlight ? 'bg-[#FFD700]/[0.03] border-x border-[#FFD700]/10' : ''}`}
                  >
                    <CellContent
                      value={row[c.key]}
                      isMidas={c.highlight}
                    />
                  </div>
                ))}
              </motion.div>
            ))}

            {/* Bottom border for MIDAS column */}
            <div className="grid grid-cols-5 gap-px">
              <div />
              {competitors.map((c) => (
                <div
                  key={c.key}
                  className={`h-1 rounded-b-xl ${c.highlight ? 'bg-gradient-to-r from-[#FFD700]/20 via-[#FFD700]/40 to-[#FFD700]/20' : ''}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="text-center text-xs text-white/30 mt-6"
        >
          * Pionex est gratuit mais prend une commission sur chaque trade. Donnees
          mises a jour en mars 2026.
        </motion.p>
      </div>
    </section>
  )
}
