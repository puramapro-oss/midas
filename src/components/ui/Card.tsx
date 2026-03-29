'use client'

import { type ReactNode, type HTMLAttributes } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils/formatters'

export type CardVariant = 'default' | 'highlighted'

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: CardVariant
  children?: ReactNode
  noPadding?: boolean
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('px-6 pt-6 pb-2', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('px-6 py-2', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('px-6 pb-6 pt-2 flex items-center gap-3', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function Card({
  variant = 'default',
  children,
  noPadding = false,
  className,
  ...props
}: CardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'relative rounded-2xl border backdrop-blur-xl transition-all duration-300',
        variant === 'default' &&
          'bg-white/[0.03] border-white/[0.06] hover:border-[#FFD700]/20 hover:shadow-[0_0_30px_rgba(255,215,0,0.05)]',
        variant === 'highlighted' &&
          'bg-[#FFD700]/[0.03] border-[#FFD700]/20 shadow-[0_0_40px_rgba(255,215,0,0.08)] hover:border-[#FFD700]/40 hover:shadow-[0_0_50px_rgba(255,215,0,0.12)]',
        !noPadding && 'p-0',
        className
      )}
      {...props}
    >
      {variant === 'highlighted' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#FFD700]/[0.04] to-transparent pointer-events-none" />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  )
}

Card.displayName = 'Card'
export default Card
