'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'

export interface ChatQuestionCounterProps {
  used: number
  total: number
  className?: string
}

export function ChatQuestionCounter({
  used,
  total,
  className,
}: ChatQuestionCounterProps) {
  const remaining = Math.max(total - used, 0)
  const percentage = total > 0 ? (used / total) * 100 : 100

  const variant = useMemo(() => {
    if (remaining === 0) return 'danger' as const
    if (remaining === 1) return 'warning' as const
    return 'default' as const
  }, [remaining])

  const barColor = {
    default: 'from-[#FFD700] to-[#FFC000]',
    warning: 'from-orange-500 to-orange-400',
    danger: 'from-red-500 to-red-400',
  }[variant]

  const barGlow = {
    default: 'shadow-[0_0_6px_rgba(255,215,0,0.3)]',
    warning: 'shadow-[0_0_6px_rgba(249,115,22,0.3)]',
    danger: 'shadow-[0_0_6px_rgba(239,68,68,0.3)]',
  }[variant]

  const textColor = {
    default: 'text-white/50',
    warning: 'text-orange-400',
    danger: 'text-red-400',
  }[variant]

  return (
    <div
      className={cn('w-full space-y-2', className)}
      data-testid="chat-question-counter"
    >
      {/* Label + counter */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {variant === 'warning' && (
            <AlertTriangle className="h-3 w-3 text-orange-400" />
          )}
          {variant === 'danger' && (
            <AlertTriangle className="h-3 w-3 text-red-400" />
          )}
          <span className={cn('text-xs', textColor)}>
            {remaining}/{total} questions restantes aujourd&apos;hui
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full bg-gradient-to-r',
            barColor,
            barGlow
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Upgrade CTA when at limit */}
      {remaining === 0 && (
        <motion.a
          href="/pricing"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1.5 text-xs text-[#FFD700] hover:text-[#FFD700]/80 transition-colors group"
          data-testid="upgrade-link"
        >
          <Zap className="h-3 w-3 group-hover:scale-110 transition-transform" />
          <span>Passer à Pro pour illimité</span>
        </motion.a>
      )}
    </div>
  )
}

ChatQuestionCounter.displayName = 'ChatQuestionCounter'
export default ChatQuestionCounter
