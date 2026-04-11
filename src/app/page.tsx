'use client'

import dynamic from 'next/dynamic'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import AILayers from '@/components/landing/AILayers'
import ShieldShowcase from '@/components/landing/ShieldShowcase'
import Pricing from '@/components/landing/Pricing'
import FAQ from '@/components/landing/FAQ'
import Footer from '@/components/landing/Footer'

const ParticleBackground = dynamic(() => import('@/components/shared/ParticleBackground'), {
  ssr: false,
})

const CursorGlow = dynamic(() => import('@/components/shared/CursorGlow'), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#06080F] overflow-x-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <ParticleBackground variant="landing" />
      </div>
      <CursorGlow>
        <div className="relative z-10">
          <Hero />
          <HowItWorks />
          <AILayers />
          <ShieldShowcase />
          <Pricing />
          <FAQ />
          <Footer />
        </div>
      </CursorGlow>
    </main>
  )
}
