'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, X, Sparkles, Crown, Zap } from 'lucide-react'

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  name: string
  icon: React.ReactNode
  monthlyPrice: number
  yearlyPrice: number
  yearlyMonthly: number
  description: string
  features: PlanFeature[]
  cta: string
  popular?: boolean
}

const plans: Plan[] = [
  {
    name: 'Free',
    icon: <Zap className="h-5 w-5" />,
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyMonthly: 0,
    description: 'Decouvrez le trading assiste par IA sans engagement.',
    cta: 'Commencer gratuitement',
    features: [
      { text: '5 questions / jour', included: true },
      { text: 'Paper trading', included: true },
      { text: '1 exchange connecte', included: true },
      { text: 'Mode Simple', included: true },
      { text: 'Trades automatiques', included: false },
      { text: 'Backtesting', included: false },
      { text: 'MIDAS SHIELD complet', included: false },
      { text: 'Whale tracking', included: false },
      { text: 'Sentiment analysis', included: false },
      { text: 'Support prioritaire', included: false },
    ],
  },
  {
    name: 'Pro',
    icon: <Sparkles className="h-5 w-5" />,
    monthlyPrice: 39,
    yearlyPrice: 313,
    yearlyMonthly: 26,
    description: 'Pour les traders serieux qui veulent un avantage reel.',
    cta: 'Passer a Pro',
    popular: true,
    features: [
      { text: 'Chat illimite avec MIDAS', included: true },
      { text: '2 trades automatiques / jour', included: true },
      { text: '2 exchanges connectes', included: true },
      { text: 'Mode Simple + Expert', included: true },
      { text: 'Backtesting complet', included: true },
      { text: 'MIDAS SHIELD complet', included: true },
      { text: 'Analyses en temps reel', included: true },
      { text: 'Whale tracking', included: false },
      { text: 'Sentiment analysis', included: false },
      { text: 'Support prioritaire', included: false },
    ],
  },
  {
    name: 'Ultra',
    icon: <Crown className="h-5 w-5" />,
    monthlyPrice: 79,
    yearlyPrice: 635,
    yearlyMonthly: 53,
    description: 'La puissance maximale pour les traders professionnels.',
    cta: 'Devenir Ultra',
    features: [
      { text: 'Tout le plan Pro inclus', included: true },
      { text: 'Trades illimites', included: true },
      { text: 'Exchanges illimites', included: true },
      { text: 'Strategies exclusives', included: true },
      { text: 'Whale tracking', included: true },
      { text: 'Sentiment analysis', included: true },
      { text: 'Support prioritaire 24/7', included: true },
      { text: 'Backtesting avance', included: true },
      { text: 'Acces beta en avant-premiere', included: true },
      { text: 'Sessions coaching mensuelles', included: true },
    ],
  },
]

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      id="pricing"
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#FFD700]/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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
            onClick={() => setIsYearly((prev) => !prev)}
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

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.12 }}
              data-testid={`plan-${plan.name.toLowerCase()}`}
              className={`relative rounded-2xl p-[1px] ${
                plan.popular
                  ? 'bg-gradient-to-b from-[#FFD700]/60 via-[#FFD700]/20 to-[#FFD700]/5'
                  : 'bg-gradient-to-b from-white/[0.08] to-white/[0.02]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-4 py-1.5 rounded-full bg-[#FFD700] text-[#06080F] text-xs font-bold tracking-wider uppercase font-[var(--font-orbitron)] shadow-lg shadow-[#FFD700]/30">
                    Populaire
                  </span>
                </div>
              )}

              <div
                className={`relative rounded-2xl p-6 sm:p-8 h-full flex flex-col ${
                  plan.popular
                    ? 'bg-[#06080F] border border-[#FFD700]/10'
                    : 'bg-white/[0.02] backdrop-blur-xl border border-white/[0.06]'
                }`}
              >
                {/* Plan header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`p-2 rounded-lg ${
                        plan.popular
                          ? 'bg-[#FFD700]/15 text-[#FFD700]'
                          : 'bg-white/5 text-white/60'
                      }`}
                    >
                      {plan.icon}
                    </div>
                    <h3
                      className={`text-xl font-bold font-[var(--font-orbitron)] ${
                        plan.popular ? 'text-[#FFD700]' : 'text-white'
                      }`}
                    >
                      {plan.name}
                    </h3>
                  </div>
                  <p className="text-white/40 text-sm font-[var(--font-dm-sans)]">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span
                      className={`text-4xl sm:text-5xl font-bold font-[var(--font-orbitron)] ${
                        plan.popular ? 'text-[#FFD700]' : 'text-white'
                      }`}
                    >
                      {plan.monthlyPrice === 0
                        ? '0'
                        : isYearly
                          ? plan.yearlyMonthly
                          : plan.monthlyPrice}
                      <span className="text-lg">€</span>
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-white/40 text-sm mb-2 font-[var(--font-dm-sans)]">
                        /mois
                      </span>
                    )}
                  </div>
                  {plan.monthlyPrice > 0 && isYearly && (
                    <p className="text-white/30 text-xs mt-1 font-[var(--font-dm-sans)]">
                      Facture {plan.yearlyPrice}€ / an
                    </p>
                  )}
                  {plan.monthlyPrice === 0 && (
                    <p className="text-white/30 text-xs mt-1 font-[var(--font-dm-sans)]">
                      Pour toujours
                    </p>
                  )}
                </div>

                {/* CTA */}
                <button
                  type="button"
                  className={`w-full py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-300 mb-8 font-[var(--font-dm-sans)] ${
                    plan.popular
                      ? 'bg-[#FFD700] text-[#06080F] hover:bg-[#FFD700]/90 shadow-lg shadow-[#FFD700]/20 hover:shadow-[#FFD700]/40'
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {plan.cta}
                </button>

                {/* Features */}
                <div className="space-y-3 flex-1">
                  <p className="text-xs text-white/30 uppercase tracking-wider font-semibold font-[var(--font-orbitron)] mb-4">
                    Fonctionnalites
                  </p>
                  {plan.features.map((feature) => (
                    <div
                      key={feature.text}
                      className="flex items-start gap-3"
                    >
                      {feature.included ? (
                        <Check className="h-4 w-4 text-[#FFD700] mt-0.5 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-white/15 mt-0.5 shrink-0" />
                      )}
                      <span
                        className={`text-sm font-[var(--font-dm-sans)] ${
                          feature.included ? 'text-white/70' : 'text-white/25'
                        }`}
                      >
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-white/30 text-xs mt-12 font-[var(--font-dm-sans)]"
        >
          Tous les prix sont en euros TTC. Annulation possible a tout moment. Micro-entreprise — TVA non applicable, art. 293B du CGI.
        </motion.p>
      </div>
    </section>
  )
}

Pricing.displayName = 'Pricing'
export default Pricing
