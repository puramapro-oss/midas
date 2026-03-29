'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils/formatters'

export type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'gold'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: ReactNode
  icon?: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/[0.06] text-white/70 border-white/[0.08]',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  gold: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
}

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

Badge.displayName = 'Badge'
export default Badge
