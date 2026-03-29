'use client'

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useState,
} from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'h-9 text-xs px-3',
  md: 'h-11 text-sm px-4',
  lg: 'h-13 text-base px-5',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      size = 'md',
      type,
      className,
      id,
      placeholder,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 z-10 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            placeholder={label ? ' ' : placeholder}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            className={cn(
              'peer w-full rounded-xl border bg-white/[0.03] text-white outline-none transition-all duration-200 placeholder:text-white/20',
              icon && 'pl-10',
              isPassword && 'pr-10',
              sizeStyles[size],
              isFocused
                ? 'border-[#FFD700]/50 shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                : 'border-white/[0.08] hover:border-white/[0.12]',
              error && 'border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
              className
            )}
            {...props}
          />

          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'absolute left-3 transition-all duration-200 pointer-events-none',
                icon && 'left-10',
                'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-white/30',
                'peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:px-1.5 peer-focus:bg-[#111116]',
                'peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:bg-[#111116]',
                isFocused ? 'text-[#FFD700]' : 'text-white/40',
                error && 'text-red-400'
              )}
            >
              {label}
            </label>
          )}

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-xs text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
