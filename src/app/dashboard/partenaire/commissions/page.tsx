'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Loader2, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { usePartnership } from '@/hooks/usePartnership';
import type { CommissionType, CommissionStatus } from '@/types/partnership';

const TYPE_LABELS: Record<CommissionType, string> = {
  first_month: '1er mois (50%)',
  recurring: 'Recurrent',
  level2: 'Niveau 2 (15%)',
  level3: 'Niveau 3 (7%)',
};

const STATUS_CONFIG: Record<CommissionStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'En attente', icon: Clock, color: 'var(--warning)' },
  approved: { label: 'Approuvee', icon: CheckCircle, color: 'var(--info)' },
  paid: { label: 'Payee', icon: DollarSign, color: 'var(--success)' },
  rejected: { label: 'Rejetee', icon: XCircle, color: 'var(--danger)' },
};

export default function CommissionsPage() {
  const { partner, commissions, loading, fetchCommissions } = usePartnership();

  useEffect(() => {
    if (partner) {
      fetchCommissions();
    }
  }, [partner, fetchCommissions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[var(--gold-primary)] animate-spin" />
      </div>
    );
  }

  const totalPending = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.amount), 0);

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
          Commissions
        </h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">En attente</p>
          <p className="text-xl font-bold text-[var(--warning)]">{totalPending.toFixed(2)} EUR</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Total paye</p>
          <p className="text-xl font-bold text-[var(--success)]">{totalPaid.toFixed(2)} EUR</p>
        </div>
      </div>

      {commissions.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-12 text-center">
          <TrendingUp className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Aucune commission</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Les commissions apparaitront ici quand vos filleuls souscriront un abonnement.
          </p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-[var(--text-tertiary)] font-medium">
            <span>Type</span>
            <span>Montant</span>
            <span>Statut</span>
            <span className="text-right">Date</span>
          </div>

          {commissions.map((commission, i) => {
            const statusConfig = STATUS_CONFIG[commission.status as CommissionStatus] ?? STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            return (
              <motion.div
                key={commission.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-4 gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="text-sm text-[var(--text-primary)]">
                  {TYPE_LABELS[commission.type as CommissionType] ?? commission.type}
                </div>
                <div className="text-sm font-medium text-[var(--gold-primary)]">
                  +{Number(commission.amount).toFixed(2)} EUR
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} />
                  <span className="text-xs" style={{ color: statusConfig.color }}>
                    {statusConfig.label}
                  </span>
                </div>
                <div className="text-sm text-[var(--text-secondary)] text-right">
                  {new Date(commission.created_at).toLocaleDateString('fr-FR')}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
