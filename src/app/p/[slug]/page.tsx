'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, QrCode, Trophy, Globe, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TIER_LABELS, TIER_COLORS } from '@/types/partnership';
import type { Partner } from '@/types/partnership';

export default function PartnerProfilePage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? '';
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchPartner = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('partners')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'active')
          .single();

        if (!error && data) {
          setPartner(data as Partner);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchPartner();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--gold-primary)] animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Partenaire non trouve
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Ce profil partenaire n&apos;existe pas ou n&apos;est plus actif.
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

  const qrUrl = `/api/partner/qr/${encodeURIComponent(partner.code)}`;
  const scanUrl = `https://midas.purama.dev/scan/${encodeURIComponent(partner.code)}`;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden"
        >
          {/* Cover gradient */}
          <div className="h-32 bg-gradient-to-r from-[#F59E0B] to-[#D97706] relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--bg-primary)]/50" />
          </div>

          {/* Profile */}
          <div className="px-6 pb-8 -mt-12 relative z-10">
            <div className="flex items-end gap-4 mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-white text-4xl font-bold border-4 border-[var(--bg-primary)] shrink-0">
                {partner.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="pb-1">
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
                    <Trophy className="w-3 h-3 inline mr-1" />
                    {TIER_LABELS[partner.tier]}
                  </span>
                </div>
              </div>
            </div>

            {partner.bio && (
              <p className="text-[var(--text-secondary)] mb-6">{partner.bio}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <Users className="w-5 h-5 text-[var(--gold-primary)] mx-auto mb-1" />
                <p className="text-xl font-bold text-[var(--text-primary)]">{partner.total_referrals}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Filleuls</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <QrCode className="w-5 h-5 text-[var(--gold-primary)] mx-auto mb-1" />
                <p className="text-xl font-bold text-[var(--text-primary)]">{partner.total_scans}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Scans</p>
              </div>
            </div>

            {/* Website */}
            {partner.website_url && (
              <a
                href={partner.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--gold-primary)] hover:underline mb-6"
              >
                <Globe className="w-4 h-4" />
                {partner.website_url.replace(/^https?:\/\//, '')}
              </a>
            )}

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="bg-[#0A0A0F] rounded-xl p-3 border border-white/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt={`QR Code de ${partner.display_name}`}
                  width={160}
                  height={160}
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* CTA */}
            <Link
              href={scanUrl.replace('https://midas.purama.dev', '')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold hover:opacity-90 transition-opacity"
              data-testid="profile-register-btn"
            >
              Rejoindre MIDAS gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
