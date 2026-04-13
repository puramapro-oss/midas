'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  CandlestickChart,
  Shield,
  Wallet,
  Bot,
  TrendingUp,
  Zap,
  CheckCircle2,
} from 'lucide-react';

const steps = [
  {
    step: 1,
    title: 'Connecte ton exchange',
    description: 'Lie ton compte Binance en 30 secondes via API. Tes fonds restent sur TON exchange, MIDAS ne les touche jamais.',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    step: 2,
    title: 'L\'IA analyse les marches',
    description: 'Analyse technique, sentiment, on-chain, calendrier macro — notre IA scanne 24/7 pour trouver les meilleures opportunites.',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
  },
  {
    step: 3,
    title: 'Recois des signaux precis',
    description: 'Signaux d\'achat/vente avec prix d\'entree, stop-loss et take-profit. Chaque signal est note par confiance et risque.',
    icon: CandlestickChart,
    color: 'from-[var(--gold-primary)] to-amber-600',
  },
  {
    step: 4,
    title: 'Trade manuellement ou en auto',
    description: 'Execute toi-meme ou active le trading automatique. Tu gardes toujours le controle avec des limites de risque.',
    icon: Bot,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    step: 5,
    title: 'Protection anti-crash',
    description: 'Le Shield detecte les crashs en temps reel et coupe automatiquement les positions pour proteger ton capital.',
    icon: Shield,
    color: 'from-red-500 to-orange-500',
  },
  {
    step: 6,
    title: 'Fais grandir ton capital',
    description: 'Suis tes performances, optimise ta strategie avec le backtesting, et debloque des recompenses en progressant.',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500',
  },
];

const features = [
  'Analyse IA multi-sources 24/7',
  'Signaux avec stop-loss et take-profit',
  'Trading automatique configurable',
  'Protection anti-crash Shield',
  'Copy trading des meilleurs traders',
  'Backtesting sur donnees historiques',
  'Paper trading sans risque',
  'Portfolio tracker multi-exchange',
  'Alertes personnalisables',
  'Communaute de traders',
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-5xl font-bold text-white mb-4"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Comment fonctionne <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--gold-primary)] to-amber-400">MIDAS</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-white/60 max-w-2xl mx-auto"
        >
          6 etapes pour transformer ton trading avec l&apos;intelligence artificielle
        </motion.p>
      </div>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-6 space-y-6 pb-16">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className="glass-card p-6 flex items-start gap-5"
          >
            <div className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
              <s.icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[var(--gold-primary)]">ETAPE {s.step}</span>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{s.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{s.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Features list */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Tout ce qui est inclus</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              className="flex items-center gap-3 glass-card p-4"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm text-[var(--text-primary)]">{f}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pb-20">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-amber-600 text-black font-bold text-lg hover:opacity-90 transition-opacity"
        >
          Commencer gratuitement
          <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-sm text-white/40 mt-3">14 jours d&apos;essai — Aucune carte requise</p>
      </div>
    </div>
  );
}
