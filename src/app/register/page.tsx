'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { registerSchema } from './register-schema'
import { RegisterForm } from './RegisterForm'
import { RegisterOAuth } from './RegisterOAuth'

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
      queueMicrotask(() => setReferralCode(ref));
      try {
        localStorage.setItem('midas_referral_code', ref)
      } catch {
        // storage unavailable
      }
    } else {
      try {
        const stored = localStorage.getItem('midas_referral_code')
        if (stored) queueMicrotask(() => setReferralCode(stored));
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

      // Si la confirmation email est active, aucune session n'existe encore ici : ce flag
      // est consomme par useAuth (syncPendingLegalAcceptance) des la premiere session
      // authentifiee (email confirme + connexion), pour que l'acceptation ne se perde jamais.
      try {
        localStorage.setItem('midas_pending_legal_accept', 'true')
      } catch {
        // storage unavailable
      }

      for (const docType of ['cgu', 'cgv', 'confidentialite'] as const) {
        fetch('/api/legal/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docType }),
        }).catch(() => {
          // best-effort : la creation de compte ne doit jamais echouer a cause de ca
        })
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

          <RegisterForm
            fullName={fullName}
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            acceptCgu={acceptCgu}
            showPassword={showPassword}
            showConfirm={showConfirm}
            loading={loading}
            errors={errors}
            onSubmit={handleSubmit}
            onFullNameChange={setFullName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onAcceptCguChange={setAcceptCgu}
            onShowPasswordChange={setShowPassword}
            onShowConfirmChange={setShowConfirm}
          />

          <RegisterOAuth googleLoading={googleLoading} onGoogleClick={handleGoogle} />

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
