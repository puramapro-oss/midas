'use client'

import { useState, useRef, useCallback, useEffect, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/formatters'

export interface SliderProps {
  min?: number
  max?: number
  step?: number
  value: number
  onChange: (value: number) => void
  label?: string
  showValue?: boolean
  formatValue?: (value: number) => string
  disabled?: boolean
  className?: string
}

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  label,
  showValue = true,
  formatValue,
  disabled = false,
  className,
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const percentage = ((value - min) / (max - min)) * 100
  const displayValue = formatValue ? formatValue(value) : String(value)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value))
  }

  const handlePointerDown = useCallback(() => {
    setIsDragging(true)
    setShowTooltip(true)
  }, [])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
    setShowTooltip(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointerup', handlePointerUp)
      return () => window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, handlePointerUp])

  return (
    <div className={cn('w-full', className)}>
      {(label ?? showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm text-white/60">{label}</span>
          )}
          {showValue && (
            <span className="text-sm font-mono text-[#FFD700] font-medium font-[family-name:var(--font-jetbrains)]">
              {displayValue}
            </span>
          )}
        </div>
      )}

      <div className="relative h-6 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/[0.06]" />

        {/* Filled track */}
        <div
          className="absolute left-0 h-1.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFC000] transition-[width] duration-75"
          style={{ width: `${percentage}%` }}
        />

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute -top-8 px-2 py-0.5 rounded-md bg-[#FFD700] text-[#0A0A0F] text-xs font-medium font-mono pointer-events-none"
              style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
            >
              {displayValue}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Native input */}
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onPointerDown={handlePointerDown}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => !isDragging && setShowTooltip(false)}
          disabled={disabled}
          className={cn(
            'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10',
            disabled && 'cursor-not-allowed'
          )}
        />

        {/* Thumb visual */}
        <div
          className={cn(
            'absolute w-4 h-4 rounded-full bg-[#FFD700] border-2 border-[#0A0A0F] shadow-[0_0_8px_rgba(255,215,0,0.4)] transition-transform duration-75 pointer-events-none',
            isDragging && 'scale-125'
          )}
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  )
}

Slider.displayName = 'Slider'
export default Slider
