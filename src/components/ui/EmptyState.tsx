'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Button, type ButtonProps } from './Button'
import { cn } from '@/lib/utils/formatters'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: ButtonProps['variant']
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/[0.06] border border-[#FFD700]/10 flex items-center justify-center mb-5 text-[#FFD700]/50">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-white/80 font-[family-name:var(--font-orbitron)]">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-sm text-white/40 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6">
          <Button
            variant={action.variant ?? 'primary'}
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </motion.div>
  )
}

EmptyState.displayName = 'EmptyState'
export default EmptyState
