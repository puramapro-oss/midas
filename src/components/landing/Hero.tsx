'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'

function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let particles: Array<{
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      opacitySpeed: number
    }> = []

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    function initParticles() {
      if (!canvas) return
      particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3 - 0.15,
        opacity: Math.random() * 0.6 + 0.1,
        opacitySpeed: (Math.random() - 0.5) * 0.005,
      }))
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        p.x += p.speedX
        p.y += p.speedY
        p.opacity += p.opacitySpeed

        if (p.opacity <= 0.05 || p.opacity >= 0.7) p.opacitySpeed *= -1
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 215, 0, ${p.opacity})`
        ctx.fill()
      }

      animationId = requestAnimationFrame(animate)
    }

    resize()
    initParticles()
    animate()

    window.addEventListener('resize', () => {
      resize()
      initParticles()
    })

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}

function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className="flex flex-col items-center gap-1"
    >
      <span className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-orbitron)] gradient-text-gold">
        {value}
      </span>
      <span className="text-sm text-white/50">{label}</span>
    </motion.div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' as const },
  },
}

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      data-testid="hero-section"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-midas-gradient" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse,rgba(255,215,0,0.08)_0%,transparent_70%)] blur-3xl" />
      </div>
      <GoldParticles />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-24 pb-20"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-pulse" />
            Trading IA nouvelle generation
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="font-[family-name:var(--font-orbitron)] text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight mb-6"
        >
          <span
            className="gradient-text-gold-animated drop-shadow-[0_0_40px_rgba(255,215,0,0.4)]"
            style={{
              textShadow: '0 0 80px rgba(255, 215, 0, 0.2), 0 0 120px rgba(255, 215, 0, 0.1)',
            }}
          >
            MIDAS
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-xl sm:text-2xl md:text-3xl font-medium text-white/90 mb-4 font-[family-name:var(--font-dm-sans)]"
        >
          L&apos;IA qui transforme vos trades en or
        </motion.p>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed font-[family-name:var(--font-dm-sans)]"
        >
          6 agents IA specialises analysent les marches 24h/24 pour vous.
          Analyse technique, sentiment, on-chain, detection de patterns et gestion
          du risque automatisee. Vous dormez, MIDAS travaille.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <a href="/register" data-testid="cta-signup">
            <Button
              size="lg"
              variant="primary"
              icon={<ArrowRight className="w-5 h-5" />}
              className="text-base px-8 py-4"
              type="button"
            >
              Commencer gratuitement
            </Button>
          </a>
          <a href="/login" data-testid="cta-demo">
            <Button
              size="lg"
              variant="secondary"
              icon={<Play className="w-5 h-5" />}
              className="text-base px-8 py-4"
              type="button"
            >
              Voir la demo
            </Button>
          </a>
        </motion.div>

        {/* Animated Stats */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-12"
        >
          <AnimatedStat value="47" label="indicateurs" delay={0.8} />
          <div className="w-px h-10 bg-white/10 hidden sm:block" />
          <AnimatedStat value="6" label="IA specialisees" delay={1.0} />
          <div className="w-px h-10 bg-white/10 hidden sm:block" />
          <AnimatedStat value="7" label="niveaux de protection" delay={1.2} />
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#06080F] to-transparent pointer-events-none" />
    </section>
  )
}
