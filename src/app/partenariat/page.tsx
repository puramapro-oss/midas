'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Globe, Mic, MapPin, ArrowRight, Trophy, Wallet, Zap, TrendingUp, Shield } from 'lucide-react';
import CommissionSimulator from '@/components/partnership/CommissionSimulator';
import { MILESTONE_TIERS, TIER_THRESHOLDS, TIER_LABELS, TIER_COLORS } from '@/types/partnership';
import type { PartnerTier } from '@/types/partnership';

const channels = [
  {
    key: 'influencer',
    label: 'Influenceur',
    description: 'Createurs de contenu, YouTubers, streamers, influenceurs crypto',
    icon: Mic,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    key: 'website',
    label: 'Site web',
    description: 'Blogs, sites d\'actualites, comparateurs, forums',
    icon: Globe,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    key: 'media',
    label: 'Media',
    description: 'Journalistes, podcasters, newsletters, presse specialisee',
    icon: Zap,
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    key: 'physical',
    label: 'Physique',
    description: 'Formateurs, evenements, meetups, conferences',
    icon: MapPin,
    gradient: 'from-green-500 to-emerald-500',
  },
];

const advantages = [
  { icon: TrendingUp, title: '50% 1er mois', description: 'Commission sur le premier paiement de chaque filleul' },
  { icon: Wallet, title: '10% a vie', description: 'Commission recurrente tant que votre filleul reste abonne' },
  { icon: Users, title: 'Niveau 2', description: '15% des commissions de vos recrutes (2 niveaux max)' },
  { icon: Trophy, title: 'Bonus paliers', description: 'Jusqu\'a 100 000 EUR de bonus en atteignant les paliers' },
  { icon: Shield, title: 'Anti-fraude', description: 'Systeme de detection avance pour proteger vos gains' },
];

export default function PartenariatPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F59E0B]/8 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-[var(--gold-primary)]/10 border border-[var(--gold-primary)]/20 text-[var(--gold-primary)] text-sm font-medium mb-6">
              Programme Partenaire MIDAS
            </span>
            <h1
              className="text-4xl md:text-6xl font-bold text-[var(--text-primary)] mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              Gagnez de l&apos;argent en partageant{' '}
              <span className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] bg-clip-text text-transparent">
                MIDAS
              </span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
              50% du premier mois + 10% a vie sur chaque filleul. Des bonus de paliers jusqu&apos;a 100 000 EUR.
              Rejoignez le programme partenaire le plus genereux du trading crypto.
            </p>
            <Link
              href="/partenariat/influencer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold text-lg hover:opacity-90 transition-opacity"
              data-testid="partner-cta-hero"
            >
              Devenir partenaire
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-12" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Pourquoi devenir partenaire ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {advantages.map((adv, i) => (
              <motion.div
                key={adv.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5"
              >
                <adv.icon className="w-8 h-8 text-[var(--gold-primary)] mb-3" />
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{adv.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{adv.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulator */}
      <section className="py-16 px-4 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-8" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Combien pouvez-vous gagner ?
          </h2>
          <CommissionSimulator />
        </div>
      </section>

      {/* Channels */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-4" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Choisissez votre canal
          </h2>
          <p className="text-[var(--text-secondary)] text-center mb-12 max-w-2xl mx-auto">
            Selectionnez le type de partenariat qui correspond a votre profil pour commencer.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {channels.map((channel, i) => (
              <motion.div
                key={channel.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={`/partenariat/${channel.key}`}
                  className="block bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:border-[var(--gold-primary)]/20 transition-all group"
                  data-testid={`channel-${channel.key}`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${channel.gradient} flex items-center justify-center mb-4`}>
                    <channel.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--gold-primary)] transition-colors">
                    {channel.label}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    {channel.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm text-[var(--gold-primary)] font-medium">
                    S&apos;inscrire
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-16 px-4 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-12" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Paliers et recompenses
          </h2>

          {/* Tiers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-12">
            {(Object.entries(TIER_THRESHOLDS) as [PartnerTier, number][]).map(([tier, threshold]) => (
              <div
                key={tier}
                className="bg-white/5 border border-white/[0.06] rounded-xl p-4 text-center"
              >
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{ background: `${TIER_COLORS[tier]}20`, border: `2px solid ${TIER_COLORS[tier]}` }}
                >
                  <Trophy className="w-5 h-5" style={{ color: TIER_COLORS[tier] }} />
                </div>
                <p className="text-sm font-bold" style={{ color: TIER_COLORS[tier] }}>
                  {TIER_LABELS[tier]}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">{threshold}+ filleuls</p>
              </div>
            ))}
          </div>

          {/* Milestone bonuses */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(MILESTONE_TIERS).map(([threshold, bonus]) => (
              <div
                key={threshold}
                className="bg-white/5 border border-white/[0.06] rounded-xl p-4 flex items-center gap-3"
              >
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{threshold} filleuls</p>
                  <p className="text-xs text-[var(--gold-primary)] font-medium">+{bonus} EUR</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Pret a commencer ?
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Inscription gratuite, gains illimites. Rejoignez des centaines de partenaires qui monetisent leur audience avec MIDAS.
          </p>
          <Link
            href="/partenariat/influencer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold text-lg hover:opacity-90 transition-opacity"
            data-testid="partner-cta-bottom"
          >
            Devenir partenaire
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
