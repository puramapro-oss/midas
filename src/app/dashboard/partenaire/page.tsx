'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, QrCode, TrendingUp, Wallet, ArrowRight, BarChart3, MessageSquare, Wrench, Loader2 } from 'lucide-react';
import { usePartnership } from '@/hooks/usePartnership';
import MilestoneTracker from '@/components/partnership/MilestoneTracker';
import { TIER_LABELS, TIER_COLORS } from '@/types/partnership';

export default function PartnerDashboardPage() {
  const { partner, stats, loading, isPartner, fetchStats } = usePartnership();

  useEffect(() => {
    if (isPartner) {
      fetchStats();
    }
  }, [isPartner, fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[var(--gold-primary)] animate-spin" />
      </div>
    );
  }

  if (!isPartner || !partner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Devenez partenaire MIDAS
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Gagnez 50% du premier mois + 10% a vie sur chaque filleul. Rejoignez le programme partenaire.
          </p>
          <Link
            href="/partenariat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold hover:opacity-90 transition-opacity"
            data-testid="partner-become-btn"
          >
            Devenir partenaire
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  const quickActions = [
    { label: 'Filleuls', icon: Users, href: '/dashboard/partenaire/filleuls', color: 'var(--info)' },
    { label: 'Commissions', icon: TrendingUp, href: '/dashboard/partenaire/commissions', color: 'var(--success)' },
    { label: 'Outils', icon: Wrench, href: '/dashboard/partenaire/outils', color: 'var(--gold-primary)' },
    { label: 'Coach IA', icon: MessageSquare, href: '/dashboard/partenaire/coach', color: '#A855F7' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Dashboard Partenaire
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${TIER_COLORS[partner.tier]}20`,
                color: TIER_COLORS[partner.tier],
              }}
            >
              {TIER_LABELS[partner.tier]}
            </span>
            <span className="text-sm text-[var(--text-tertiary)]">
              Code : <span className="font-mono text-[var(--text-secondary)]">{partner.code}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Scans', value: stats?.totalScans ?? partner.total_scans, icon: QrCode, color: 'var(--info)' },
          { label: 'Filleuls', value: stats?.totalReferrals ?? partner.total_referrals, icon: Users, color: 'var(--success)' },
          { label: 'Gains totaux', value: `${(stats?.totalEarned ?? Number(partner.total_earned)).toFixed(2)} EUR`, icon: TrendingUp, color: 'var(--gold-primary)' },
          { label: 'Solde', value: `${(stats?.currentBalance ?? Number(partner.current_balance)).toFixed(2)} EUR`, icon: Wallet, color: '#A855F7' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-xs text-[var(--text-tertiary)]">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Monthly stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Scans ce mois</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{stats.scansThisMonth}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Filleuls ce mois</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{stats.referralsThisMonth}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Taux de conversion</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{stats.conversionRate}%</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Actions rapides
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/[0.06] hover:border-[var(--gold-primary)]/20 transition-all group"
                data-testid={`partner-action-${action.label.toLowerCase()}`}
              >
                <action.icon className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: action.color }} />
                <span className="text-sm font-medium text-[var(--text-primary)]">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Milestone Tracker */}
        <MilestoneTracker
          currentReferrals={partner.total_referrals}
          currentTier={partner.tier}
        />
      </div>
    </div>
  );
}
