'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  label,
  error,
  disabled = false,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return
    onChange?.(option.value)
    setIsOpen(false)
  }

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    },
    []
  )

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClickOutside, handleKeyDown])

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      {label && (
        <label className="block text-xs text-white/40 mb-1.5">{label}</label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative w-full h-11 px-4 rounded-xl border bg-white/[0.03] text-left text-sm transition-all duration-200 flex items-center justify-between gap-2',
          isOpen
            ? 'border-[#FFD700]/50 shadow-[0_0_12px_rgba(255,215,0,0.15)]'
            : 'border-white/[0.08] hover:border-white/[0.12]',
          error && 'border-red-500/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={selected ? 'text-white' : 'text-white/30'}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.icon}
              {selected.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-white/30 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full max-h-60 overflow-auto rounded-xl border border-white/[0.08] bg-[#111116] backdrop-blur-xl shadow-xl"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                disabled={option.disabled}
                className={cn(
                  'w-full px-4 py-2.5 text-sm text-left flex items-center justify-between gap-2 transition-colors',
                  option.value === value
                    ? 'text-[#FFD700] bg-[#FFD700]/5'
                    : 'text-white/70 hover:text-white hover:bg-white/5',
                  option.disabled && 'opacity-30 cursor-not-allowed'
                )}
              >
                <span className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </span>
                {option.value === value && (
                  <Check className="h-4 w-4 text-[#FFD700]" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}

Select.displayName = 'Select'
export default Select
