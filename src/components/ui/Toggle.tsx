'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/formatters'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const sizeConfig = {
  sm: { track: 'w-9 h-5', thumb: 'w-3.5 h-3.5', translate: 17 },
  md: { track: 'w-11 h-6', thumb: 'w-4.5 h-4.5', translate: 21 },
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}: ToggleProps) {
  const config = sizeConfig[size]

  return (
    <label
      className={cn(
        'flex items-center gap-3 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative rounded-full transition-colors duration-200 shrink-0',
          config.track,
          checked
            ? 'bg-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.3)]'
            : 'bg-white/10'
        )}
      >
        <motion.div
          className={cn(
            'absolute top-0.5 left-0.5 rounded-full',
            config.thumb,
            checked ? 'bg-[#0A0A0F]' : 'bg-white/60'
          )}
          animate={{ x: checked ? config.translate : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>

      {(label ?? description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm text-white/80">{label}</span>
          )}
          {description && (
            <span className="text-xs text-white/40">{description}</span>
          )}
        </div>
      )}
    </label>
  )
}

Toggle.displayName = 'Toggle'
export default Toggle
