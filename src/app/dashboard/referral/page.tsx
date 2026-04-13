'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Gift, Copy, Check, Users, DollarSign, TrendingUp,
  Share2, Award, Crown, Star, Zap, Shield, Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const TIERS = [
  { name: 'Bronze', min: 1, icon: Award, color: '#CD7F32', reward: 'Badge Bronze' },
  { name: 'Argent', min: 5, icon: Star, color: '#C0C0C0', reward: '-10% sur ton abo' },
  { name: 'Or', min: 15, icon: Trophy, color: '#FFD700', reward: '1 mois Pro gratuit' },
  { name: 'Platine', min: 30, icon: Crown, color: '#E5E4E2', reward: '1 mois Ultra gratuit' },
  { name: 'Diamant', min: 50, icon: Zap, color: '#B9F2FF', reward: '3 mois Ultra gratuit' },
  { name: 'Legende', min: 100, icon: Shield, color: '#FF6B00', reward: 'Ultra a vie' },
];

interface ReferralStats {
  code: string;
  totalReferred: number;
  totalEarned: number;
  pendingCount: number;
  convertedCount: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 22, delay: i * 0.06 },
  }),
};

export default function ReferralPage() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({
    code: '',
    totalReferred: 0,
    totalEarned: 0,
    pendingCount: 0,
    convertedCount: 0,
  });

  useEffect(() => {
    if (profile?.referral_code) {
      setStats((prev) => ({ ...prev, code: profile.referral_code ?? '' }));
    }
  }, [profile]);

  const shareUrl = stats.code
    ? `https://midas.purama.dev/register?ref=${stats.code}`
    : '';

  const handleCopy = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Lien copie !');
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MIDAS — Trading IA',
          text: 'Rejois MIDAS et recois -50% sur ton 1er mois !',
          url: shareUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  }, [shareUrl, handleCopy]);

  const currentTierIndex = TIERS.findIndex((t) => stats.totalReferred < t.min) - 1;
  const currentTier = currentTierIndex >= 0 ? TIERS[currentTierIndex] : null;
  const nextTier = TIERS[currentTierIndex + 1] ?? TIERS[TIERS.length - 1];
  const progressToNext = nextTier
    ? Math.min(100, (stats.totalReferred / nextTier.min) * 100)
    : 100;

  return (
    <div className="space-y-6" data-testid="referral-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          Parrainage
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Invite tes amis, gagne des commissions a vie.
        </p>
      </div>

      {/* Share card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="rounded-2xl border border-[#FFD700]/20 bg-gradient-to-br from-[#FFD700]/[0.06] to-transparent backdrop-blur-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#FFD700]/15">
            <Gift className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">
              Ton lien de parrainage
            </h2>
            <p className="text-xs text-white/40">Partage-le et gagne 50% du 1er paiement + 10% a vie</p>
          </div>
        </div>

        {/* Code display */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-mono text-[#FFD700] truncate" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {stats.code || 'Chargement...'}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            data-testid="copy-referral"
            className="px-4 py-3 rounded-xl bg-[#FFD700]/15 border border-[#FFD700]/25 text-[#FFD700] hover:bg-[#FFD700]/25 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Share URL */}
        <div className="px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-white/30 truncate mb-4 font-mono" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
          {shareUrl || '...'}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFD700] text-[#06080F] text-sm font-semibold hover:bg-[#FFD700]/90 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copier le lien
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm hover:bg-white/[0.06] transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Filleuls', value: stats.totalReferred, icon: Users, color: '#FFD700' },
          { label: 'En attente', value: stats.pendingCount, icon: Gift, color: '#F59E0B' },
          { label: 'Convertis', value: stats.convertedCount, icon: Check, color: '#10B981' },
          { label: 'Gains totaux', value: `${stats.totalEarned.toFixed(2)}€`, icon: DollarSign, color: '#FFD700' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{stat.label}</span>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4 font-[family-name:var(--font-orbitron)]">
          Comment ca marche
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Partage ton lien', desc: 'Envoie ton lien a tes amis traders' },
            { step: '2', title: 'Ton filleul s\'inscrit', desc: 'Il recoit -50% sur son 1er mois' },
            { step: '3', title: 'Tu gagnes', desc: '50% du 1er paiement + 10% a vie' },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#FFD700]/15 flex items-center justify-center text-[#FFD700] text-xs font-bold shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{s.title}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tiers */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">
            Paliers
          </h3>
          {currentTier && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border" style={{ color: currentTier.color, borderColor: `${currentTier.color}40`, backgroundColor: `${currentTier.color}15` }}>
              {currentTier.name}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-[10px] text-white/30 mb-1.5">
            <span>{stats.totalReferred} filleuls</span>
            <span>Prochain : {nextTier.name} ({nextTier.min})</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFC107]"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.5 }}
            />
          </div>
        </div>

        {/* Tier list */}
        <div className="space-y-2">
          {TIERS.map((tier) => {
            const reached = stats.totalReferred >= tier.min;
            return (
              <div
                key={tier.name}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${reached ? 'bg-white/[0.04]' : 'opacity-50'}`}
              >
                <tier.icon className="w-4 h-4 shrink-0" style={{ color: tier.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{tier.name} <span className="text-white/30 font-normal">— {tier.min} filleuls</span></p>
                  <p className="text-[11px] text-white/40">{tier.reward}</p>
                </div>
                {reached && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Binance referral note */}
      <div className="rounded-xl border border-[#F0B90B]/20 bg-[#F0B90B]/[0.04] p-4">
        <p className="text-xs text-white/50">
          <span className="text-[#F0B90B] font-semibold">Pas encore de compte Binance ?</span>{' '}
          <a
            href="https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00BM2GEU29"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F0B90B] underline underline-offset-2 hover:text-[#F0B90B]/80"
          >
            Cree ton compte ici
          </a>{' '}
          et recois un bonus a l&apos;inscription.
        </p>
      </div>
    </div>
  );
}
