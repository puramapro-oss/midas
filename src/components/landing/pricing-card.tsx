'use client'

import { motion } from 'framer-motion'
import { Check, X, Loader2 } from 'lucide-react'
import { Plan } from './pricing-plans'

interface PricingCardProps {
  plan: Plan
  index: number
  isInView: boolean
  isYearly: boolean
  loadingPlan: string | null
  cta: {
    label: string
    href?: string
    disabled: boolean
    onClick?: () => void
  }
}

export function PricingCard({ plan, index, isInView, isYearly, loadingPlan, cta }: PricingCardProps) {
  return (
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
        {cta.href ? (
          <a
            href={cta.href}
            className={`w-full py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-300 mb-8 font-[var(--font-dm-sans)] text-center block ${
              plan.popular
                ? 'bg-[#FFD700] text-[#06080F] hover:bg-[#FFD700]/90 shadow-lg shadow-[#FFD700]/20 hover:shadow-[#FFD700]/40'
                : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
            data-testid={`cta-${plan.name.toLowerCase()}`}
          >
            {cta.label}
          </a>
        ) : (
          <button
            type="button"
            disabled={cta.disabled}
            onClick={cta.onClick}
            className={`w-full py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-300 mb-8 font-[var(--font-dm-sans)] text-center flex items-center justify-center gap-2 ${
              cta.disabled
                ? 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                : plan.popular
                  ? 'bg-[#FFD700] text-[#06080F] hover:bg-[#FFD700]/90 shadow-lg shadow-[#FFD700]/20 hover:shadow-[#FFD700]/40'
                  : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
            data-testid={`cta-${plan.name.toLowerCase()}`}
          >
            {loadingPlan === plan.slug && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {cta.label}
          </button>
        )}

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
  )
}
