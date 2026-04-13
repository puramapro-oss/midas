'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  CheckCircle,
  MapPin,
  Mail,
  Building2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/formatters';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = 'Le nom est requis';
  if (!data.email.trim()) errors.email = "L'email est requis";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Email invalide';
  if (!data.subject.trim()) errors.subject = 'Le sujet est requis';
  if (!data.message.trim()) errors.message = 'Le message est requis';
  else if (data.message.trim().length < 10) errors.message = 'Le message doit faire au moins 10 caractères';
  return errors;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const particles = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.6,
  duration: 1.5 + Math.random() * 1.5,
  size: 3 + Math.random() * 5,
}));

export default function ContactPage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setApiError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error ?? 'Erreur lors de l\'envoi. Réessaie.');
        return;
      }

      setSent(true);
    } catch {
      setApiError('Erreur réseau. Vérifie ta connexion et réessaie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080F] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,215,0,0.06),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 sm:py-20">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-[#FFD700] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </Link>
        </motion.div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="text-center py-20 relative"
            >
              {/* Particle burst */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {particles.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: '50%', x: `${p.x}%`, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: [50, -100 - Math.random() * 200],
                      scale: [0, 1, 0.5],
                    }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      ease: 'easeOut',
                    }}
                    className="absolute rounded-full bg-[#FFD700]"
                    style={{ width: p.size, height: p.size }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              >
                <div className="w-20 h-20 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-[#FFD700]" />
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)] mb-3"
              >
                Message envoyé
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-white/50 max-w-md mx-auto"
              >
                Merci pour ton message. Notre équipe te répondra sous 24 à 48 heures.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 flex items-center justify-center gap-4"
              >
                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-white hover:border-white/20 transition-all"
                >
                  Accueil
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setForm({ name: '', email: '', subject: '', message: '' });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-sm text-[#FFD700] hover:bg-[#FFD700]/20 transition-all"
                >
                  Envoyer un autre message
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
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
                onSubmit={handleSubmit}
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
                      onChange={(e) => handleChange('name', e.target.value)}
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
                      onChange={(e) => handleChange('email', e.target.value)}
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
                    onChange={(e) => handleChange('subject', e.target.value)}
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
                    onChange={(e) => handleChange('message', e.target.value)}
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

              {/* Company info */}
              <motion.div
                variants={itemVariants}
                className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 text-center">
                  <Building2 className="h-5 w-5 text-[#FFD700]/40 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white/70">SASU PURAMA</p>
                  <p className="text-[10px] text-white/30 mt-1">TVA non applicable, art. 293 B du CGI</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 text-center">
                  <MapPin className="h-5 w-5 text-[#FFD700]/40 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white/70">8 Rue de la Chapelle</p>
                  <p className="text-[10px] text-white/30 mt-1">25560 Frasne, France</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 text-center">
                  <Mail className="h-5 w-5 text-[#FFD700]/40 mx-auto mb-2" />
                  <a
                    href="mailto:purama.pro@gmail.com"
                    className="text-xs font-semibold text-white/70 hover:text-[#FFD700] transition-colors"
                  >
                    purama.pro@gmail.com
                  </a>
                  <p className="text-[10px] text-white/30 mt-1">Support par email</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
