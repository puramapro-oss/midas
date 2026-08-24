'use client'

import { motion } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { FormData, FormErrors, itemVariants } from './contact-config'

interface ContactFormFieldsProps {
  form: FormData
  errors: FormErrors
  apiError: string
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  onChange: (field: keyof FormData, value: string) => void
}

export function ContactFormFields({
  form,
  errors,
  apiError,
  submitting,
  onSubmit,
  onChange,
}: ContactFormFieldsProps) {
  return (
    <>
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 text-[10px] text-[#FFD700] font-medium mb-4">
          <Sparkles className="h-3 w-3" />
          Réponse sous 24-48h
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          Contacte-nous
        </h1>
        <p className="text-sm text-white/40 mt-3 max-w-md mx-auto">
          Une question, une suggestion ou un partenariat ? Notre équipe est là pour toi.
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        variants={itemVariants}
        onSubmit={onSubmit}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Name */}
          <div>
            <label htmlFor="contact-name" className="block text-xs font-medium text-white/50 mb-1.5">
              Nom
            </label>
            <input
              id="contact-name"
              type="text"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              className={cn(
                'w-full h-11 px-4 rounded-xl border bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200',
                errors.name
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/[0.08] hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.1)]'
              )}
              placeholder="Ton nom"
            />
            {errors.name && (
              <p className="text-xs text-red-400 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="contact-email" className="block text-xs font-medium text-white/50 mb-1.5">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
              className={cn(
                'w-full h-11 px-4 rounded-xl border bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200',
                errors.email
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/[0.08] hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.1)]'
              )}
              placeholder="ton@email.com"
            />
            {errors.email && (
              <p className="text-xs text-red-400 mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="contact-subject" className="block text-xs font-medium text-white/50 mb-1.5">
            Sujet
          </label>
          <input
            id="contact-subject"
            type="text"
            value={form.subject}
            onChange={(e) => onChange('subject', e.target.value)}
            className={cn(
              'w-full h-11 px-4 rounded-xl border bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200',
              errors.subject
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/[0.08] hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.1)]'
            )}
            placeholder="De quoi s'agit-il ?"
          />
          {errors.subject && (
            <p className="text-xs text-red-400 mt-1">{errors.subject}</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label htmlFor="contact-message" className="block text-xs font-medium text-white/50 mb-1.5">
            Message
          </label>
          <textarea
            id="contact-message"
            value={form.message}
            onChange={(e) => onChange('message', e.target.value)}
            rows={5}
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 resize-none',
              errors.message
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/[0.08] hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.1)]'
            )}
            placeholder="Décris ta demande en détail..."
          />
          {errors.message && (
            <p className="text-xs text-red-400 mt-1">{errors.message}</p>
          )}
        </div>

        {/* API error */}
        {apiError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
          >
            {apiError}
          </motion.p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'w-full h-12 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200',
            submitting
              ? 'bg-[#FFD700]/20 text-[#FFD700]/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0F] hover:shadow-[0_0_30px_rgba(255,215,0,0.2)] active:scale-[0.98]'
          )}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Envoi en cours...
            </span>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Envoyer le message
            </>
          )}
        </button>
      </motion.form>
    </>
  )
}
