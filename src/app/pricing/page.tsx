import Pricing from '@/components/landing/Pricing'
import Footer from '@/components/landing/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tarifs — MIDAS',
  description: 'Decouvrez les plans MIDAS : Free, Pro (39€/mois) et Ultra (79€/mois). Trading IA, SHIELD a 7 niveaux, paper trading illimite.',
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0F]">
      <div className="pt-16">
        <Pricing />
      </div>

      <section className="max-w-3xl mx-auto px-4 pb-24 text-center">
        <p className="text-white/30 text-xs">
          Le trading comporte des risques de perte en capital. Les performances passees ne garantissent pas les resultats futurs.
        </p>
      </section>
      <Footer />
    </main>
  )
}
