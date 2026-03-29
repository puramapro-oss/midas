'use client'

import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import AILayers from '@/components/landing/AILayers'
import ShieldShowcase from '@/components/landing/ShieldShowcase'
import Comparison from '@/components/landing/Comparison'
import Pricing from '@/components/landing/Pricing'
import Testimonials from '@/components/landing/Testimonials'
import FAQ from '@/components/landing/FAQ'
import Footer from '@/components/landing/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#06080F] overflow-x-hidden">
      <Hero />
      <HowItWorks />
      <AILayers />
      <ShieldShowcase />
      <Comparison />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  )
}
