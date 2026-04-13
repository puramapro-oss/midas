'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Users, QrCode, TrendingUp, Wallet, Shield, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TIER_LABELS, TIER_COLORS, CHANNEL_LABELS } from '@/types/partnership';
import type { Partner, PartnerStatus } from '@/types/partnership';

export default function AdminPartnerDetailPage() {
  const params = useParams();
  const partnerId = params?.id as string;
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchPartner = useCallback(async () => {
    if (!partnerId) return;
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();

      if (data) {
        setPartner(data as Partner);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPartner();
    }
  }, [isSuperAdmin, fetchPartner]);

  const updateStatus = useCallback(async (newStatus: PartnerStatus) => {
    if (!partner || updating) return;
    setUpdating(true);
    try {
      const supabase = createClient();
      await supabase
        .from('partners')
        .update({ status: newStatus })
        .eq('id', partner.id);

      setPartner((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch {
      // silently fail
    } finally {
      setUpdating(false);
    }
  }, [partner, updating]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[var(--gold-primary)] animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[var(--text-secondary)]">Partenaire non trouve</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: 'var(--success)',
    pending: 'var(--warning)',
    suspended: 'var(--danger)',
    banned: '#991B1B',
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/partenaires"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Liste des partenaires
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-white text-2xl font-bold">
            {partner.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
              {partner.display_name}
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
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: `${statusColors[partner.status]}20`,
                  color: statusColors[partner.status],
                }}
              >
                {partner.status}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {CHANNEL_LABELS[partner.channel]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <QrCode className="w-4 h-4 text-[var(--info)] mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{partner.total_scans}</p>
          <p className="text-xs text-[var(--text-tertiary)]">Scans</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <Users className="w-4 h-4 text-[var(--success)] mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{partner.total_referrals}</p>
          <p className="text-xs text-[var(--text-tertiary)]">Filleuls</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <TrendingUp className="w-4 h-4 text-[var(--gold-primary)] mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{Number(partner.total_earned).toFixed(2)} EUR</p>
          <p className="text-xs text-[var(--text-tertiary)]">Gains totaux</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <Wallet className="w-4 h-4 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{Number(partner.current_balance).toFixed(2)} EUR</p>
          <p className="text-xs text-[var(--text-tertiary)]">Solde</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Informations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--text-tertiary)]">Code : </span>
            <span className="text-[var(--text-primary)] font-mono">{partner.code}</span>
          </div>
          <div>
            <span className="text-[var(--text-tertiary)]">Slug : </span>
            <span className="text-[var(--text-primary)] font-mono">{partner.slug}</span>
          </div>
          <div>
            <span className="text-[var(--text-tertiary)]">IBAN : </span>
            <span className="text-[var(--text-primary)]">{partner.iban ?? 'Non renseigne'}</span>
          </div>
          <div>
            <span className="text-[var(--text-tertiary)]">Seuil retrait : </span>
            <span className="text-[var(--text-primary)]">{partner.payout_threshold} EUR</span>
          </div>
          <div>
            <span className="text-[var(--text-tertiary)]">Inscription : </span>
            <span className="text-[var(--text-primary)]">{new Date(partner.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          {partner.bio && (
            <div className="sm:col-span-2">
              <span className="text-[var(--text-tertiary)]">Bio : </span>
              <span className="text-[var(--text-primary)]">{partner.bio}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {partner.status !== 'active' && (
            <button
              onClick={() => updateStatus('active')}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-sm font-medium hover:bg-[var(--success)]/20 transition-colors disabled:opacity-50"
              data-testid="admin-approve-partner"
            >
              <CheckCircle className="w-4 h-4" />
              Approuver
            </button>
          )}
          {partner.status !== 'suspended' && partner.status !== 'banned' && (
            <button
              onClick={() => updateStatus('suspended')}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[var(--warning)] text-sm font-medium hover:bg-[var(--warning)]/20 transition-colors disabled:opacity-50"
              data-testid="admin-suspend-partner"
            >
              <AlertTriangle className="w-4 h-4" />
              Suspendre
            </button>
          )}
          {partner.status !== 'banned' && (
            <button
              onClick={() => updateStatus('banned')}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm font-medium hover:bg-[var(--danger)]/20 transition-colors disabled:opacity-50"
              data-testid="admin-ban-partner"
            >
              <Ban className="w-4 h-4" />
              Bannir
            </button>
          )}
          <Link
            href={`/p/${partner.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/[0.06] text-[var(--text-secondary)] text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Voir profil public
          </Link>
        </div>
      </div>
    </div>
  );
}
