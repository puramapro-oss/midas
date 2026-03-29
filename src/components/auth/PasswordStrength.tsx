'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface PasswordStrengthProps {
  password: string
}

interface StrengthLevel {
  label: string
  color: string
  bg: string
  score: number
}

function getStrength(password: string): StrengthLevel {
  if (!password) {
    return { label: '', color: '', bg: '', score: 0 }
  }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) {
    return { label: 'Faible', color: '#EF4444', bg: 'rgba(239,68,68,0.2)', score: 1 }
  }
  if (score <= 2) {
    return { label: 'Moyen', color: '#F59E0B', bg: 'rgba(245,158,11,0.2)', score: 2 }
  }
  if (score <= 3) {
    return { label: 'Fort', color: '#10B981', bg: 'rgba(16,185,129,0.2)', score: 3 }
  }
  return { label: 'Tres fort', color: '#FFD700', bg: 'rgba(255,215,0,0.2)', score: 4 }
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => getStrength(password), [password])

  if (!password) return null

  return (
    <div className="space-y-1.5" data-testid="password-strength">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <motion.div
            key={level}
            className="h-1 flex-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: strength.score >= level ? '100%' : '0%',
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ background: strength.score >= level ? strength.color : 'transparent' }}
            />
          </motion.div>
        ))}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs"
        style={{ color: strength.color }}
      >
        {strength.label}
      </motion.p>
    </div>
  )
}
