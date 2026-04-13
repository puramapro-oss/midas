'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { QrCode, ArrowRight, Users, Trophy, Loader2 } from 'lucide-react';
import { TIER_LABELS, TIER_COLORS } from '@/types/partnership';
import type { PartnerTier } from '@/types/partnership';

interface PartnerInfo {
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  tier: PartnerTier;
}

export default function ScanPage() {
  const params = useParams();
  const code = (params?.code as string) ?? '';
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    const logScan = async () => {
      try {
        const res = await fetch('/api/partner/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            referrer_url: typeof document !== 'undefined' ? document.referrer : undefined,
          }),
        });

        const data = await res.json();

        if (res.ok && data.partner) {
          setPartner(data.partner as PartnerInfo);
          // Store partner code in localStorage for referral tracking
          try {
            localStorage.setItem('midas_partner_code', code);
            document.cookie = `midas_partner=${code}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
          } catch {
            // Storage unavailable
          }
        } else {
          setError(data.error ?? 'Code invalide');
        }
      } catch {
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    logScan();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--gold-primary)] animate-spin" />
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <QrCode className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Code invalide
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            {error ?? 'Ce lien partenaire n\'est pas valide.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold hover:opacity-90 transition-opacity"
          >
            Decouvrir MIDAS
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F59E0B]/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 text-center"
        >
          {/* Partner info */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            {partner.display_name.charAt(0).toUpperCase()}
          </div>

          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1" style={{ fontFamily: 'var(--font-orbitron)' }}>
            {partner.display_name}
          </h1>

          <div className="flex items-center justify-center gap-2 mb-4">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${TIER_COLORS[partner.tier]}20`,
                color: TIER_COLORS[partner.tier],
              }}
            >
              <Trophy className="w-3 h-3 inline mr-1" />
              {TIER_LABELS[partner.tier]}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">Partenaire MIDAS</span>
          </div>

          {partner.bio && (
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {partner.bio}
            </p>
          )}

          <div className="border-t border-white/[0.06] pt-6 mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              Rejoignez MIDAS gratuitement
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              L&apos;assistant IA de trading crypto le plus avance.
            </p>
            <p className="text-xs text-[var(--gold-primary)]">
              Invite par {partner.display_name}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href={`/register?ref=${code}`}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold hover:opacity-90 transition-opacity"
              data-testid="scan-register-btn"
            >
              <Users className="w-5 h-5" />
              Creer mon compte gratuit
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/[0.06] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              data-testid="scan-login-btn"
            >
              Deja un compte ? Se connecter
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
