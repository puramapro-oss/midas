'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Users, Loader2, UserCheck, UserX, Clock } from 'lucide-react';
import { usePartnership } from '@/hooks/usePartnership';

const STATUS_CONFIG = {
  pending: { label: 'En attente', icon: Clock, color: 'var(--warning)' },
  active: { label: 'Actif', icon: UserCheck, color: 'var(--success)' },
  churned: { label: 'Perdu', icon: UserX, color: 'var(--danger)' },
};

export default function FilleulsPage() {
  const { partner, referrals, loading, fetchReferrals } = usePartnership();

  useEffect(() => {
    if (partner) {
      fetchReferrals();
    }
  }, [partner, fetchReferrals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[var(--gold-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/partenaire"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard partenaire
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
          Mes filleuls
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {referrals.length} filleul{referrals.length !== 1 ? 's' : ''}
        </p>
      </div>

      {referrals.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Aucun filleul</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Partagez votre lien ou QR code pour commencer a parrainer.
          </p>
          <Link
            href="/dashboard/partenaire/outils"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Voir mes outils
          </Link>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-[var(--text-tertiary)] font-medium">
            <span>Utilisateur</span>
            <span>Date</span>
            <span>Statut</span>
            <span className="text-right">Commission</span>
          </div>

          {/* Rows */}
          {referrals.map((referral, i) => {
            const statusConfig = STATUS_CONFIG[referral.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            return (
              <motion.div
                key={referral.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-4 gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="text-sm text-[var(--text-primary)] truncate">
                  {referral.referred_email ?? 'Utilisateur'}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} />
                  <span className="text-xs" style={{ color: statusConfig.color }}>
                    {statusConfig.label}
                  </span>
                </div>
                <div className="text-sm text-right font-medium text-[var(--text-primary)]">
                  {Number(referral.total_commission_earned).toFixed(2)} EUR
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
