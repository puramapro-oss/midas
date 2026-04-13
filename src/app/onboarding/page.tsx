'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Shield, TrendingUp, ExternalLink,
  Key, Eye, EyeOff, AlertTriangle, Check,
  Rocket, ChevronLeft, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const BINANCE_REF = 'https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00BM2GEU29';
const TOTAL_STEPS = 6;
const STEP_LABELS = ['Bienvenue', 'Binance', 'Clés API', 'Coller', 'Risque', 'Prêt'];

const RISK_PROFILES = [
  { id: 0, label: 'Prudent', pct: '1-2%', color: '#10B981', icon: Shield, desc: 'Préservation du capital. Idéal pour débuter.' },
  { id: 1, label: 'Modéré', pct: '2-5%', color: '#F59E0B', icon: TrendingUp, desc: 'Équilibre risque/rendement. Le plus populaire.' },
  { id: 2, label: 'Agressif', pct: '5-10%', color: '#EF4444', icon: Rocket, desc: 'Rendements maximaux. Pour les traders expérimentés.' },
];

const API_STEPS = [
  { letter: 'a', text: 'Va dans Paramètres > Gestion API sur Binance' },
  { letter: 'b', text: 'Clique "Créer une API"' },
  { letter: 'c', text: 'Choisis "Clé API générée par le système"' },
  { letter: 'd', text: 'Active UNIQUEMENT : Lecture + Trading Spot' },
  { letter: 'e', text: 'Copie la clé API et la clé secrète' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading, refetch } = useAuth();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [riskLevel, setRiskLevel] = useState(1);
  const [saving, setSaving] = useState(false);

  // If already onboarded, redirect to dashboard
  useEffect(() => {
    if (!loading && profile?.onboarding_completed) {
      router.replace('/dashboard');
    }
  }, [loading, profile, router]);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)), []);
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const handleSaveKeys = useCallback(async () => {
    if (!apiKey || !apiSecret) {
      next();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/keys/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret, exchange: 'binance' }),
      });
      if (res.ok) {
        toast.success('Clés API enregistrées et chiffrées');
      } else {
        toast.error('Erreur lors de la sauvegarde des clés');
      }
    } catch {
      toast.error('Erreur réseau');
    }
    setSaving(false);
    next();
  }, [apiKey, apiSecret, next]);

  const handleFinish = useCallback(async () => {
    if (!user) { router.push('/dashboard'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskLevel }),
      });
      if (res.ok) {
        await refetch();
        router.push('/dashboard');
      } else {
        toast.error('Erreur lors de la finalisation');
      }
    } catch {
      toast.error('Erreur réseau');
    }
    setSaving(false);
  }, [user, riskLevel, refetch, router]);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-[#06080F] flex flex-col" data-testid="onboarding-page">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#FFD700]/[0.02] blur-[150px]" />
      </div>

      {/* Progress */}
      <div className="relative z-10 px-4 pt-6 pb-2 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3 px-1">
          {STEP_LABELS.map((label, i) => (
            <span key={label} className={`text-[10px] sm:text-xs font-medium transition-colors ${i <= step ? 'text-[#FFD700]' : 'text-white/25'}`} style={{ fontFamily: 'var(--font-orbitron)' }}>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </span>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#DAA520]" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <p className="text-xs text-white/30 mt-2 text-right">{step + 1} / {TOTAL_STEPS}</p>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>

              {/* STEP 0: Bienvenue */}
              {step === 0 && (
                <div className="text-center max-w-lg mx-auto">
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="mb-8">
                    <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FFD700]/20 to-[#B8860B]/10 border border-[#FFD700]/20 animate-pulse-glow">
                      <span className="text-4xl font-bold gradient-text-gold-animated" style={{ fontFamily: 'var(--font-orbitron)' }}>M</span>
                    </div>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-orbitron)' }} data-testid="welcome-title">Bienvenue sur MIDAS</h2>
                  <p className="text-white/50 mb-10 leading-relaxed">L&apos;IA trade pour toi, tu gardes le contrôle total. Tes fonds restent sur ton exchange, MIDAS ne peut jamais les retirer.</p>
                  <div className="grid gap-3 mb-10">
                    {[
                      { icon: TrendingUp, title: '6 agents IA', desc: 'Analyse technique, sentiment, on-chain en temps réel' },
                      { icon: Shield, title: '7 niveaux de protection', desc: 'MIDAS Shield protège ton capital automatiquement' },
                      { icon: Sparkles, title: 'Trading 24/7', desc: 'Tu dors, MIDAS travaille' },
                    ].map((f, i) => (
                      <motion.div key={f.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center"><f.icon className="h-5 w-5 text-[#FFD700]" /></div>
                        <div><p className="text-sm font-medium text-white">{f.title}</p><p className="text-xs text-white/40">{f.desc}</p></div>
                      </motion.div>
                    ))}
                  </div>
                  <button type="button" onClick={next} data-testid="welcome-next" className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:brightness-110 transition-all">
                    Commencer la configuration
                  </button>
                </div>
              )}

              {/* STEP 1: Crée ton compte Binance */}
              {step === 1 && (
                <div className="text-center max-w-lg mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-[#F0B90B]/15 flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-[#F0B90B]">B</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-orbitron)' }}>Crée ton compte Binance</h2>
                  <p className="text-white/50 mb-8">Binance est le plus grand exchange mondial. Crée un compte gratuit pour commencer à trader avec MIDAS.</p>
                  <a href={BINANCE_REF} target="_blank" rel="noopener noreferrer" data-testid="binance-create" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#F0B90B] text-[#0A0A0F] font-semibold text-sm hover:brightness-110 transition-all mb-4">
                    Créer mon compte Binance <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-white/30 text-xs mb-8">Tu reçois un bonus à l&apos;inscription via ce lien</p>
                  <button type="button" onClick={next} data-testid="binance-skip" className="text-sm text-[#FFD700]/70 hover:text-[#FFD700] transition-colors underline underline-offset-2">
                    Tu as déjà un compte ? Passe à l&apos;étape suivante
                  </button>
                </div>
              )}

              {/* STEP 2: Guide création clés API */}
              {step === 2 && (
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-orbitron)' }}>Crée tes clés API</h2>
                    <p className="text-white/50">Suis ces étapes sur Binance pour générer tes clés API :</p>
                  </div>
                  <div className="space-y-3 mb-6">
                    {API_STEPS.map((s, i) => (
                      <motion.div key={s.letter} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="w-7 h-7 rounded-lg bg-[#FFD700]/15 flex items-center justify-center text-[#FFD700] text-xs font-bold shrink-0">{s.letter}</div>
                        <p className="text-sm text-white/70 pt-0.5">{s.text}</p>
                      </motion.div>
                    ))}
                  </div>
                  {/* Red alert */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 mb-8">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-400">NE JAMAIS activer la permission &quot;Retrait&quot;</p>
                        <p className="text-xs text-red-400/60 mt-1">MIDAS n&apos;a besoin que de Lecture + Trading Spot. Avec &quot;Retrait&quot; désactivé, personne ne peut retirer tes fonds, même si tes clés étaient compromises.</p>
                      </div>
                    </div>
                  </motion.div>
                  <button type="button" onClick={next} data-testid="guide-next" className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm hover:brightness-110 transition-all">
                    J&apos;ai mes clés, continuer
                  </button>
                </div>
              )}

              {/* STEP 3: Coller les clés */}
              {step === 3 && (
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-orbitron)' }}>Colle tes clés</h2>
                    <p className="text-white/50">Tes clés sont chiffrées en AES-256 et jamais stockées en clair.</p>
                  </div>
                  <div className="space-y-4 mb-6 p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="h-4 w-4 text-[#FFD700]" />
                      <span className="text-sm font-medium text-white">Clés API Binance</span>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Clé API</label>
                      <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Colle ta clé API ici" data-testid="api-key-input" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-[#FFD700]/40 font-mono" style={{ fontFamily: 'var(--font-jetbrains-mono)' }} />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Clé secrète</label>
                      <div className="relative">
                        <input type={showSecret ? 'text' : 'password'} value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="Colle ta clé secrète ici" data-testid="api-secret-input" className="w-full px-4 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-[#FFD700]/40 font-mono" style={{ fontFamily: 'var(--font-jetbrains-mono)' }} />
                        <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400/80 text-xs">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Chiffrement AES-256-GCM côté serveur</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={next} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-white/50 text-sm hover:bg-white/[0.04] transition-colors">Plus tard</button>
                    <button type="button" onClick={handleSaveKeys} disabled={saving} data-testid="keys-save" className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {apiKey && apiSecret ? 'Enregistrer et continuer' : 'Passer'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Profil de risque */}
              {step === 4 && (
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-orbitron)' }}>Choisis ton profil de risque</h2>
                    <p className="text-white/50">Combien es-tu prêt à risquer par trade ?</p>
                  </div>
                  <div className="space-y-3 mb-8">
                    {RISK_PROFILES.map((r, i) => {
                      const active = riskLevel === r.id;
                      return (
                        <motion.button key={r.id} type="button" onClick={() => setRiskLevel(r.id)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${active ? 'border-[#FFD700]/40 bg-[#FFD700]/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'}`} data-testid={`risk-${r.id}`}>
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${r.color}15` }}>
                              <r.icon className="h-5 w-5" style={{ color: r.color }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">{r.label}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full border" style={{ color: r.color, borderColor: `${r.color}40`, backgroundColor: `${r.color}10` }}>{r.pct} / trade</span>
                                {active && <motion.div layoutId="risk-dot" className="w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center ml-auto"><Check className="w-3 h-3 text-[#0A0A0F]" /></motion.div>}
                              </div>
                              <p className="text-xs text-white/40 mt-0.5">{r.desc}</p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={next} data-testid="risk-next" className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm hover:brightness-110 transition-all">
                    Continuer
                  </button>
                </div>
              )}

              {/* STEP 5: MIDAS est prêt */}
              {step === 5 && (
                <div className="text-center max-w-lg mx-auto">
                  <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="mb-8 inline-flex">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#B8860B]/10 border border-[#FFD700]/30 flex items-center justify-center animate-pulse-glow">
                      <Rocket className="h-10 w-10 text-[#FFD700]" />
                    </div>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-orbitron)' }} data-testid="ready-title">MIDAS est prêt</h2>
                  <p className="text-white/50 mb-4">Ton assistant IA de trading est configuré. Tu peux modifier ces paramètres à tout moment dans les réglages.</p>
                  <div className="space-y-2 mb-8 text-left max-w-xs mx-auto">
                    {[
                      { label: 'Risque', value: RISK_PROFILES[riskLevel].label },
                      { label: 'Exchange', value: apiKey ? 'Binance connecté' : 'Non connecté' },
                      { label: 'Protection', value: 'MIDAS Shield 7/7 actifs' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]">
                        <span className="text-xs text-white/40">{s.label}</span>
                        <span className="text-xs font-medium text-white">{s.value}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleFinish} disabled={saving} data-testid="activate-midas" className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                    Activer MIDAS
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Back button */}
      {step > 0 && step < 5 && (
        <div className="relative z-10 px-4 pb-6 max-w-2xl mx-auto w-full">
          <button type="button" onClick={prev} data-testid="onboarding-back" className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
        </div>
      )}
    </div>
  );
}
