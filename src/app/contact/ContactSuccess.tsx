'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { particles } from './contact-config'

interface ContactSuccessProps {
  onSendAnother: () => void
}

export function ContactSuccess({ onSendAnother }: ContactSuccessProps) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="text-center py-20 relative"
    >
      {/* Particle burst */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: '50%', x: `${p.x}%`, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              y: [50, -100 - p.yOffset],
              scale: [0, 1, 0.5],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: 'easeOut',
            }}
            className="absolute rounded-full bg-[#FFD700]"
            style={{ width: p.size, height: p.size }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <div className="w-20 h-20 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-[#FFD700]" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)] mb-3"
      >
        Message envoyé
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-white/50 max-w-md mx-auto"
      >
        Merci pour ton message. Notre équipe te répondra sous 24 à 48 heures.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 flex items-center justify-center gap-4"
      >
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-white hover:border-white/20 transition-all"
        >
          Accueil
        </Link>
        <button
          type="button"
          onClick={onSendAnother}
          className="px-5 py-2.5 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-sm text-[#FFD700] hover:bg-[#FFD700]/20 transition-all"
        >
          Envoyer un autre message
        </button>
      </motion.div>
    </motion.div>
  )
}
