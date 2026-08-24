'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { Plan, plans } from './pricing-plans'
import { PricingHeader } from './pricing-header'
import { PricingCard } from './pricing-card'

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const router = useRouter()
  const { isAuthenticated, isSuperAdmin, plan: userPlan } = useAuth()

  const isMaxPlan = isSuperAdmin || userPlan === 'ultra'

  const handleCheckout = useCallback(async (planSlug: 'pro' | 'ultra') => {
    if (!isAuthenticated) {
      router.push(`/register?plan=${planSlug}`)
      return
    }

    if (isMaxPlan) return

    setLoadingPlan(planSlug)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planSlug,
          period: isYearly ? 'yearly' : 'monthly',
          idempotencyKey: crypto.randomUUID(),
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Checkout error:', data.error)
        router.push(`/register?plan=${planSlug}`)
      }
    } catch {
      router.push(`/register?plan=${planSlug}`)
    } finally {
      setLoadingPlan(null)
    }
  }, [isAuthenticated, isMaxPlan, isYearly, router])

  const getCtaProps = (plan: Plan) => {
    if (plan.slug === 'free') {
      if (isAuthenticated) {
        return { label: 'Plan actuel', href: '/dashboard', disabled: false, onClick: undefined }
      }
      return { label: plan.cta, href: '/register', disabled: false, onClick: undefined }
    }

    if (isMaxPlan) {
      return { label: 'Tu es deja sur le plan maximum', href: undefined, disabled: true, onClick: undefined }
    }

    if (isAuthenticated && userPlan === plan.slug) {
      return { label: 'Plan actuel', href: '/dashboard', disabled: false, onClick: undefined }
    }

    return {
      label: loadingPlan === plan.slug ? 'Redirection...' : plan.cta,
      href: undefined,
      disabled: loadingPlan !== null,
      onClick: () => handleCheckout(plan.slug as 'pro' | 'ultra'),
    }
  }

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
        <PricingHeader
          isInView={isInView}
          isMaxPlan={isMaxPlan}
          isAuthenticated={isAuthenticated}
          isYearly={isYearly}
          onToggleYearly={() => setIsYearly((prev) => !prev)}
        />

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              index={index}
              isInView={isInView}
              isYearly={isYearly}
              loadingPlan={loadingPlan}
              cta={getCtaProps(plan)}
            />
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
