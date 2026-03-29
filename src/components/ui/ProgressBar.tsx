'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/formatters'

export interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  formatValue?: (value: number, max: number) => string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'gold' | 'success' | 'danger' | 'info'
  animated?: boolean
  className?: string
}

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

const variantStyles = {
  gold: 'from-[#FFD700] to-[#FFC000]',
  success: 'from-emerald-500 to-emerald-400',
  danger: 'from-red-500 to-red-400',
  info: 'from-cyan-500 to-cyan-400',
}

const glowStyles = {
  gold: 'shadow-[0_0_8px_rgba(255,215,0,0.3)]',
  success: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  danger: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  info: 'shadow-[0_0_8px_rgba(6,182,212,0.3)]',
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  formatValue,
  size = 'md',
  variant = 'gold',
  animated = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const displayValue = formatValue
    ? formatValue(value, max)
    : `${Math.round(percentage)}%`

  return (
    <div className={cn('w-full', className)}>
      {(label ?? showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs text-white/50">{label}</span>
          )}
          {showValue && (
            <span className="text-xs font-mono text-white/60 font-[family-name:var(--font-jetbrains)]">
              {displayValue}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full rounded-full bg-white/[0.06] overflow-hidden',
          sizeStyles[size]
        )}
      >
        <motion.div
          className={cn(
            'h-full rounded-full bg-gradient-to-r',
            variantStyles[variant],
            glowStyles[variant]
          )}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={
            animated
              ? { duration: 0.8, ease: 'easeOut' }
              : { duration: 0 }
          }
        />
      </div>
    </div>
  )
}

ProgressBar.displayName = 'ProgressBar'
export default ProgressBar
