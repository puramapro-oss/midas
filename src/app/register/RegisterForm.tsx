'use client'

import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import PasswordStrength from '@/components/auth/PasswordStrength'

interface RegisterFormProps {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  acceptCgu: boolean
  showPassword: boolean
  showConfirm: boolean
  loading: boolean
  errors: Record<string, string>
  onSubmit: (e: React.FormEvent) => void
  onFullNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onAcceptCguChange: (value: boolean) => void
  onShowPasswordChange: (value: boolean) => void
  onShowConfirmChange: (value: boolean) => void
}

export function RegisterForm({
  fullName,
  email,
  password,
  confirmPassword,
  acceptCgu,
  showPassword,
  showConfirm,
  loading,
  errors,
  onSubmit,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onAcceptCguChange,
  onShowPasswordChange,
  onShowConfirmChange,
}: RegisterFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Full name */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1.5 ml-1">
          Nom complet
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            placeholder="Votre nom complet"
            data-testid="fullname-input"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#FFD700]/40 focus:shadow-[0_0_0_3px_rgba(255,215,0,0.08)] focus:outline-none transition-all text-sm"
          />
        </div>
        {errors.fullName && (
          <p className="text-red-400 text-xs mt-1 ml-1" data-testid="fullname-error">{errors.fullName}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1.5 ml-1">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="votre@email.com"
            data-testid="email-input"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#FFD700]/40 focus:shadow-[0_0_0_3px_rgba(255,215,0,0.08)] focus:outline-none transition-all text-sm"
          />
        </div>
        {errors.email && (
          <p className="text-red-400 text-xs mt-1 ml-1" data-testid="email-error">{errors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1.5 ml-1">
          Mot de passe
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="8 caracteres min, majuscule + chiffre"
            data-testid="password-input"
            className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#FFD700]/40 focus:shadow-[0_0_0_3px_rgba(255,215,0,0.08)] focus:outline-none transition-all text-sm"
          />
          <button
            type="button"
            onClick={() => onShowPasswordChange(!showPassword)}
            data-testid="toggle-password"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2">
          <PasswordStrength password={password} />
        </div>
        {errors.password && (
          <p className="text-red-400 text-xs mt-1 ml-1" data-testid="password-error">{errors.password}</p>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1.5 ml-1">
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Confirmez votre mot de passe"
            data-testid="confirm-password-input"
            className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#FFD700]/40 focus:shadow-[0_0_0_3px_rgba(255,215,0,0.08)] focus:outline-none transition-all text-sm"
          />
          <button
            type="button"
            onClick={() => onShowConfirmChange(!showConfirm)}
            data-testid="toggle-confirm-password"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-red-400 text-xs mt-1 ml-1" data-testid="confirm-error">{errors.confirmPassword}</p>
        )}
      </div>

      {/* CGU checkbox */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onAcceptCguChange(!acceptCgu)}
          data-testid="cgu-checkbox"
          className={`mt-0.5 h-5 w-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${
            acceptCgu
              ? 'bg-[#FFD700] border-[#FFD700]'
              : 'border-white/20 bg-white/[0.04] hover:border-white/30'
          }`}
        >
          {acceptCgu && <Check className="h-3.5 w-3.5 text-[#0A0A0F]" />}
        </button>
        <label className="text-xs text-[var(--text-secondary)] leading-relaxed">
          J&apos;accepte les{' '}
          <Link
            href="/legal/cgu"
            data-testid="cgu-link"
            className="text-[#FFD700]/80 hover:text-[#FFD700] underline underline-offset-2 transition-colors"
          >
            CGU
          </Link>
          {', les '}
          <Link
            href="/legal/cgv"
            data-testid="cgv-link"
            className="text-[#FFD700]/80 hover:text-[#FFD700] underline underline-offset-2 transition-colors"
          >
            CGV
          </Link>
          {' et la '}
          <Link
            href="/legal/privacy"
            data-testid="privacy-link"
            className="text-[#FFD700]/80 hover:text-[#FFD700] underline underline-offset-2 transition-colors"
          >
            Politique de Confidentialite
          </Link>
        </label>
      </div>
      {errors.acceptCgu && (
        <p className="text-red-400 text-xs ml-1" data-testid="cgu-error">{errors.acceptCgu}</p>
      )}

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={loading}
        whileTap={loading ? undefined : { scale: 0.97 }}
        whileHover={loading ? undefined : { scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        data-testid="register-button"
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Creer mon compte
      </motion.button>
    </form>
  )
}
