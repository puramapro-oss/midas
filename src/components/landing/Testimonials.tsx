'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

interface Testimonial {
  name: string
  role: string
  quote: string
  initials: string
  color: string
  stars: number
}

const testimonials: Testimonial[] = [
  {
    name: 'Marc D.',
    role: 'Trader depuis 2 ans',
    quote:
      'Win rate de 73% sur 3 mois avec MIDAS Pro. L\'IA identifie des patterns que je n\'aurais jamais vus seul. Mon portefeuille a fait +42% depuis que j\'utilise les signaux automatiques.',
    initials: 'MD',
    color: '#FFD700',
    stars: 5,
  },
  {
    name: 'Sophie L.',
    role: 'Debutante en crypto',
    quote:
      'MIDAS m\'a appris a trader intelligemment. Le mode Simple m\'explique tout sans jargon technique. En 2 mois, je suis passee du paper trading a de vrais trades rentables. L\'IA est un vrai coach.',
    initials: 'SL',
    color: '#38BDF8',
    stars: 5,
  },
  {
    name: 'Thomas R.',
    role: 'Day trader',
    quote:
      'Le SHIELD m\'a sauve pendant le crash de fevrier. Quand le marche a plonge de 30%, MIDAS avait deja coupe mes positions et securise mes gains. Sans lui, j\'aurais perdu plus de 8000€.',
    initials: 'TR',
    color: '#10B981',
    stars: 5,
  },
  {
    name: 'Lea M.',
    role: 'Investisseuse',
    quote:
      'Le meilleur rapport qualite/prix du marche. J\'ai teste 3 Commas, Cryptohopper et d\'autres. MIDAS Pro a 33€/mois fait mieux que des outils a 100€+. Le backtesting est incroyablement precis.',
    initials: 'LM',
    color: '#A855F7',
    stars: 5,
  },
]

export function Testimonials() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FFD700]/[0.02] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#FFD700]/[0.015] rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-xs font-semibold tracking-wider uppercase mb-4 font-[var(--font-orbitron)]">
            Temoignages
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 font-[var(--font-orbitron)]">
            Ils tradent avec MIDAS
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto font-[var(--font-dm-sans)]">
            Des milliers de traders font confiance a MIDAS pour optimiser leurs performances.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
              className="group relative"
            >
              <div className="relative rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] p-6 sm:p-8 hover:border-[#FFD700]/15 transition-all duration-300 h-full">
                {/* Quote icon */}
                <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
                  <Quote className="h-8 w-8 text-[#FFD700]/10" />
                </div>

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.stars }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-[#FFD700] text-[#FFD700]"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-6 font-[var(--font-dm-sans)]">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 font-[var(--font-orbitron)]"
                    style={{
                      backgroundColor: `${testimonial.color}15`,
                      color: testimonial.color,
                      border: `1px solid ${testimonial.color}30`,
                    }}
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold font-[var(--font-dm-sans)]">
                      {testimonial.name}
                    </p>
                    <p className="text-white/40 text-xs font-[var(--font-dm-sans)]">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

Testimonials.displayName = 'Testimonials'
export default Testimonials
