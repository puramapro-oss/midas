'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  TrendingUp,
  Brain,
  Sparkles,
  Shield,
  Coins,
  Heart,
  BookOpen,
  Briefcase,
  Globe,
  Palette,
  Dumbbell,
  Scale,
  Calculator,
  Users,
  Compass,
  Zap,
  Gamepad2,
  Music,
} from 'lucide-react';

const apps = [
  { slug: 'midas', name: 'MIDAS', tagline: 'Trading IA', icon: TrendingUp, color: '#F59E0B', active: true },
  { slug: 'akasha', name: 'AKASHA', tagline: 'Multi-IA', icon: Brain, color: '#00d4ff', active: false },
  { slug: 'jurispurama', name: 'JurisPurama', tagline: 'Aide juridique IA', icon: Scale, color: '#6D28D9', active: false },
  { slug: 'kaia', name: 'KAIA', tagline: 'Sante IA', icon: Heart, color: '#06B6D4', active: false },
  { slug: 'kash', name: 'KASH', tagline: 'Finance perso', icon: Coins, color: '#F59E0B', active: false },
  { slug: 'prana', name: 'PRANA', tagline: 'Bien-etre IA', icon: Sparkles, color: '#F472B6', active: false },
  { slug: 'sutra', name: 'SUTRA', tagline: 'Video IA', icon: Palette, color: '#8B5CF6', active: false },
  { slug: 'exodus', name: 'EXODUS', tagline: 'RPG bien-etre', icon: Gamepad2, color: '#22C55E', active: false },
  { slug: 'lingora', name: 'Lingora', tagline: 'Langues IA', icon: Globe, color: '#3B82F6', active: false },
  { slug: 'vida', name: 'VIDA', tagline: 'Sante connectee', icon: Dumbbell, color: '#10B981', active: false },
  { slug: 'compta', name: 'Compta', tagline: 'Comptabilite IA', icon: Calculator, color: '#0EA5E9', active: false },
  { slug: 'lumios', name: 'LUMIOS', tagline: 'Associations IA', icon: Users, color: '#14B8A6', active: false },
  { slug: 'entreprise-pilot', name: 'EntreprisePilot', tagline: 'Gestion entreprise', icon: Briefcase, color: '#6366F1', active: false },
  { slug: 'purama-ai', name: 'Purama AI', tagline: 'Assistant universel', icon: Zap, color: '#8B5CF6', active: false },
  { slug: 'origin', name: 'Origin', tagline: 'Creation de sites', icon: Compass, color: '#D946EF', active: false },
  { slug: 'aether', name: 'AETHER', tagline: 'Art IA', icon: Music, color: '#E879F9', active: false },
  { slug: 'mana', name: 'MANA', tagline: 'Crypto IA', icon: Shield, color: '#A855F7', active: false },
  { slug: 'dona', name: 'DONA', tagline: 'Dons & solidarite', icon: Heart, color: '#EC4899', active: false },
  { slug: 'voya', name: 'VOYA', tagline: 'Voyage IA', icon: BookOpen, color: '#F97316', active: false },
];

export default function EcosystemPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-5xl font-bold text-white mb-4"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Ecosysteme <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--gold-primary)] to-amber-400">Purama</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-white/60 max-w-2xl mx-auto"
        >
          19 applications IA pour chaque domaine de ta vie. Un compte unique, des points partages, une communaute connectee.
        </motion.p>

        {/* Cross-promo banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[var(--gold-primary)]/10 to-amber-500/10 border border-[var(--gold-primary)]/20"
        >
          <Sparkles className="w-4 h-4 text-[var(--gold-primary)]" />
          <span className="text-sm text-[var(--gold-primary)] font-medium">-50% avec le code CROSS50 sur toute l&apos;ecosysteme</span>
        </motion.div>
      </div>

      {/* Apps grid */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {apps.map((app, i) => (
            <motion.div
              key={app.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              {app.active ? (
                <Link
                  href="/dashboard"
                  className="glass-card p-5 block hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${app.color}20` }}>
                      <app.icon className="w-5 h-5" style={{ color: app.color }} />
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Actif</span>
                  </div>
                  <p className="font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">{app.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{app.tagline}</p>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] mt-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <div className="glass-card p-5 opacity-60">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${app.color}10` }}>
                      <app.icon className="w-5 h-5" style={{ color: app.color }} />
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[var(--text-secondary)] font-medium">Bientot</span>
                  </div>
                  <p className="font-bold text-[var(--text-primary)]">{app.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{app.tagline}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Back to MIDAS */}
      <div className="text-center pb-16">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-amber-600 text-black font-semibold hover:opacity-90 transition-opacity"
        >
          Retour a MIDAS
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
