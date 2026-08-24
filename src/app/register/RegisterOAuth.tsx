'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface RegisterOAuthProps {
  googleLoading: boolean
  onGoogleClick: () => void
}

export function RegisterOAuth({ googleLoading, onGoogleClick }: RegisterOAuthProps) {
  return (
    <>
      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-white/[0.08]" />
        <span className="text-xs text-[var(--text-tertiary)]">ou</span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>

      {/* Google */}
      <motion.button
        type="button"
        onClick={onGoogleClick}
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
    </>
  )
}
