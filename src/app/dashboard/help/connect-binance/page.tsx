'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

const BINANCE_REFERRAL = process.env.NEXT_PUBLIC_BINANCE_REFERRAL_LINK ?? 'https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00BM2GEU29'

interface Step {
  title: string
  description: string
  warning?: string
  imageAlt: string
}

const STEPS: Step[] = [
  {
    title: 'Creer un compte Binance',
    description: "Si tu n'as pas encore de compte Binance, clique sur le bouton ci-dessous. C'est gratuit et ca prend 2 minutes. Tu beneficieras d'une reduction sur tes frais de trading.",
    imageAlt: "Page d'accueil Binance",
  },
  {
    title: 'Se connecter a Binance',
    description: 'Connecte-toi a ton compte Binance avec ton email et ton mot de passe.',
    imageAlt: 'Page de login Binance',
  },
  {
    title: 'Aller dans les parametres API',
    description: "Clique sur ton avatar en haut a droite, puis sur 'Gestion API'. Tu peux aussi aller directement sur binance.com/fr/my/settings/api-management",
    imageAlt: "Menu avec fleche sur Gestion API",
  },
  {
    title: 'Creer une nouvelle cle API',
    description: "Clique sur 'Creer une API'. Choisis un nom, par exemple 'MIDAS'. Binance va te demander une verification (email ou 2FA).",
    imageAlt: "Bouton Creer une API",
  },
  {
    title: 'Configurer les permissions',
    description: "Coche UNIQUEMENT ces 2 permissions : Lecture des informations et Activer le trading Spot.",
    warning: "NE COCHE JAMAIS 'Activer les retraits'. MIDAS n'a pas besoin de retirer ton argent. Ton argent reste sur TON compte Binance.",
    imageAlt: 'Cases a cocher permissions',
  },
  {
    title: 'Copier la cle API',
    description: "Binance affiche ta cle API (API Key). Copie-la et garde-la en securite. Tu ne pourras plus la revoir apres.",
    imageAlt: 'Cle API affichee',
  },
  {
    title: 'Copier la cle secrete',
    description: "Binance affiche aussi ta cle secrete (Secret Key). Copie-la immediatement. Elle ne sera plus jamais visible apres cette page.",
    imageAlt: 'Cle secrete affichee',
  },
  {
    title: 'Coller dans MIDAS',
    description: "Retourne sur MIDAS. Colle ta cle API et ta cle secrete dans les champs ci-dessous. MIDAS les chiffre automatiquement (AES-256). Personne ne peut les voir, meme pas nous.",
    imageAlt: 'Formulaire MIDAS',
  },
]

export default function ConnectBinancePage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const isFirstStep = currentStep === 0

  const handleConnect = async () => {
    if (!apiKey || !apiSecret) return
    setConnecting(true)
    try {
      const res = await fetch('/api/exchange/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchange: 'binance', apiKey, apiSecret }),
      })
      if (res.ok) {
        setConnected(true)
      }
    } catch {
      // handled by UI
    } finally {
      setConnecting(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(BINANCE_REFERRAL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/help"
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors"
        data-testid="back-to-help"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour a l'aide
      </Link>

      {/* Title */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-orbitron)' }}
          data-testid="binance-guide-title"
        >
          Connecter Binance
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Suis ces 8 etapes pour connecter ton compte Binance a MIDAS
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i <= currentStep ? 'bg-[#FFD700]' : 'bg-white/[0.06]'
            }`}
          />
        ))}
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">
          Etape {currentStep + 1} sur {STEPS.length}
        </span>
        <span className="text-xs text-[#FFD700] font-medium">{step.title}</span>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card variant={step.warning ? 'highlighted' : 'default'}>
            <CardContent className="p-6 space-y-4">
              {/* Step title */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center text-sm font-bold text-[#FFD700]">
                  {currentStep + 1}
                </div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {step.title}
                </h2>
              </div>

              {/* Description */}
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {step.description}
              </p>

              {/* Warning */}
              {step.warning && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 font-medium leading-relaxed">
                    {step.warning}
                  </p>
                </div>
              )}

              {/* Image placeholder */}
              {/* TISSMA: Remplace les placeholders par des vraies captures d'ecran de Binance */}
              <div
                className="w-full h-48 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] flex flex-col items-center justify-center gap-2"
                data-testid={`guide-image-step-${currentStep + 1}`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#FFD700]/5 flex items-center justify-center">
                  <span className="text-lg">📸</span>
                </div>
                <p className="text-xs text-white/20">{step.imageAlt}</p>
                <p className="text-[10px] text-white/10">Screenshot a ajouter</p>
              </div>

              {/* Step 1 special: Binance referral button */}
              {currentStep === 0 && (
                <div className="space-y-3">
                  <a
                    href={BINANCE_REFERRAL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F3BA2F] text-[#0A0A0F] text-sm font-bold hover:bg-[#F3BA2F]/90 transition-all"
                    data-testid="create-binance-account"
                  >
                    Creer mon compte Binance
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/60 hover:text-white/80 hover:border-white/[0.12] transition-all"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Lien copie !' : 'Copier le lien'}
                  </button>
                </div>
              )}

              {/* Step 5 special: Permission checklist */}
              {currentStep === 4 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-emerald-300">Lecture des informations</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-emerald-300">Activer le trading Spot</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-pulse">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-300 line-through">Activer les retraits — JAMAIS</span>
                  </div>
                </div>
              )}

              {/* Step 8 special: API key input form */}
              {isLastStep && !connected && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Cle API</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Colle ta cle API ici..."
                      className="w-full h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:border-[#FFD700]/50 focus:outline-none transition-all font-mono"
                      data-testid="binance-api-key-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Cle secrete</label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Colle ta cle secrete ici..."
                        className="w-full h-11 px-4 pr-10 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:border-[#FFD700]/50 focus:outline-none transition-all font-mono"
                        data-testid="binance-secret-key-input"
                      />
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                        type="button"
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-white/30">
                    <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <span>Tes cles sont chiffrees AES-256 avant stockage. Personne ne peut les voir, meme pas nous.</span>
                  </div>

                  <button
                    onClick={handleConnect}
                    disabled={!apiKey || !apiSecret || connecting}
                    className="w-full py-3 rounded-xl bg-[#FFD700] text-[#0A0A0F] text-sm font-bold hover:bg-[#FFD700]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    data-testid="connect-exchange-btn"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connexion en cours...
                      </>
                    ) : (
                      'Connecter mon exchange'
                    )}
                  </button>
                </div>
              )}

              {/* Connected success */}
              {connected && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-6 space-y-3"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-400">Binance connecte !</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    MIDAS est pret a analyser et trader pour toi.
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-sm font-semibold hover:bg-[#FFD700]/20 transition-all"
                  >
                    Aller au dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      {!connected && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={isFirstStep}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/60 hover:text-white/80 hover:border-white/[0.12] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            data-testid="prev-step"
          >
            <ArrowLeft className="h-4 w-4" />
            Precedent
          </button>

          {!isLastStep && (
            <button
              onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-sm font-semibold hover:bg-[#FFD700]/20 transition-all"
              data-testid="next-step"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
