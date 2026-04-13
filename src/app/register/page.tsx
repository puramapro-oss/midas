'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, Loader2, Check } from 'lucide-react'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import PasswordStrength from '@/components/auth/PasswordStrength'

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
    email: z.email('Adresse email invalide'),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
      .regex(/[A-Z]/, 'Au moins une majuscule requise')
      .regex(/[0-9]/, 'Au moins un chiffre requis'),
    confirmPassword: z.string(),
    acceptCgu: z.literal(true, 'Vous devez accepter les CGU'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, signInWithGoogle } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptCgu, setAcceptCgu] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [referralCode, setReferralCode] = useState<string | null>(null)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setReferralCode(ref)
      try {
        localStorage.setItem('midas_referral_code', ref)
      } catch {
        // storage unavailable
      }
    } else {
      try {
        const stored = localStorage.getItem('midas_referral_code')
        if (stored) setReferralCode(stored)
      } catch {
        // storage unavailable
      }
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      acceptCgu,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const { error } = await signUp(email, password, fullName)
      if (error) {
        if (error.includes('already registered') || error.includes('already been registered')) {
          setErrors({ form: 'Un compte existe deja avec cette adresse email' })
        } else {
          setErrors({ form: error })
        }
        return
      }

      if (referralCode) {
        try {
          localStorage.setItem('midas_pending_referral', referralCode)
        } catch {
          // storage unavailable
        }
      }

      toast.success('Compte cree avec succes !')
      router.push('/onboarding')
    } catch {
      setErrors({ form: 'Une erreur est survenue. Reessayez.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        toast.error('Erreur lors de la connexion Google')
      }
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[var(--bg-primary)] bg-midas-gradient bg-grid relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#FFD700]/[0.04] blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="glass-gold rounded-2xl p-8 shadow-[0_0_60px_rgba(255,215,0,0.06)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-bold gradient-text-gold-animated tracking-wider"
              style={{ fontFamily: 'var(--font-orbitron)' }}
              data-testid="register-logo"
            >
              MIDAS
            </motion.h1>
            <p className="text-[var(--text-secondary)] text-sm mt-2">
              Creez votre compte gratuitement
            </p>
            {referralCode && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-[#FFD700]/80 mt-1"
              >
                Code de parrainage : {referralCode}
              </motion.p>
            )}
          </div>

          {errors.form && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
              data-testid="register-error"
            >
              {errors.form}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  onChange={(e) => setFullName(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caracteres min, majuscule + chiffre"
                  data-testid="password-input"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#FFD700]/40 focus:shadow-[0_0_0_3px_rgba(255,215,0,0.08)] focus:outline-none transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez votre mot de passe"
                  data-testid="confirm-password-input"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#FFD700]/40 focus:shadow-[0_0_0_3px_rgba(255,215,0,0.08)] focus:outline-none transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
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
                onClick={() => setAcceptCgu(!acceptCgu)}
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

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-[var(--text-tertiary)]">ou</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Google */}
          <motion.button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            whileTap={googleLoading ? undefined : { scale: 0.97 }}
            whileHover={googleLoading ? undefined : { scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            data-testid="google-button"
            className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[var(--text-primary)] text-sm font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continuer avec Google
          </motion.button>

          {/* Login link */}
          <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
            Deja un compte ?{' '}
            <Link
              href="/login"
              data-testid="login-link"
              className="text-[#FFD700] hover:text-[#FFE44D] font-medium transition-colors"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#06080F]" />}>
      <RegisterContent />
    </Suspense>
  )
}
