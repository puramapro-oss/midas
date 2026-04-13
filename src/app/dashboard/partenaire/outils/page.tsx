'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Link2, Loader2, ExternalLink } from 'lucide-react';
import { usePartnership } from '@/hooks/usePartnership';
import QRGenerator from '@/components/partnership/QRGenerator';

export default function OutilsPage() {
  const { partner, loading } = usePartnership();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [utmSource, setUtmSource] = useState('partner');
  const [utmMedium, setUtmMedium] = useState('referral');
  const [utmCampaign, setUtmCampaign] = useState('');

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  if (loading) {
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

  const baseUrl = `https://midas.purama.dev/scan/${partner.code}`;
  const utmUrl = utmCampaign
    ? `${baseUrl}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${encodeURIComponent(utmCampaign)}`
    : baseUrl;
  const profileUrl = `https://midas.purama.dev/p/${partner.slug}`;

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
          Outils partenaire
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Link */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[var(--gold-primary)]" />
            Lien de parrainage
          </h2>

          <div className="space-y-3">
            {/* Scan link */}
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Lien de scan</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={baseUrl}
                  readOnly
                  className="flex-1 bg-white/5 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono truncate"
                />
                <button
                  onClick={() => copyToClipboard(baseUrl, 'scan')}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/[0.06] hover:bg-white/10 transition-colors"
                  data-testid="copy-scan-link"
                >
                  {copiedField === 'scan' ? (
                    <Check className="w-4 h-4 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>
              </div>
            </div>

            {/* Profile link */}
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Profil public</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profileUrl}
                  readOnly
                  className="flex-1 bg-white/5 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono truncate"
                />
                <button
                  onClick={() => copyToClipboard(profileUrl, 'profile')}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/[0.06] hover:bg-white/10 transition-colors"
                  data-testid="copy-profile-link"
                >
                  {copiedField === 'profile' ? (
                    <Check className="w-4 h-4 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>
              </div>
            </div>

            {/* Code */}
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Code partenaire</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={partner.code}
                  readOnly
                  className="flex-1 bg-white/5 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono"
                />
                <button
                  onClick={() => copyToClipboard(partner.code, 'code')}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/[0.06] hover:bg-white/10 transition-colors"
                  data-testid="copy-code"
                >
                  {copiedField === 'code' ? (
                    <Check className="w-4 h-4 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <QRGenerator code={partner.code} />

        {/* UTM Builder */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-[var(--gold-primary)]" />
            Generateur UTM
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Source</label>
              <input
                type="text"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                placeholder="partner"
                className="w-full bg-white/5 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold-primary)]/30"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Medium</label>
              <input
                type="text"
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                placeholder="referral"
                className="w-full bg-white/5 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold-primary)]/30"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Campagne</label>
              <input
                type="text"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="spring-2026"
                className="w-full bg-white/5 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold-primary)]/30"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={utmUrl}
              readOnly
              className="flex-1 bg-white/5 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono truncate"
            />
            <button
              onClick={() => copyToClipboard(utmUrl, 'utm')}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-medium text-sm hover:opacity-90 transition-opacity"
              data-testid="copy-utm-link"
            >
              {copiedField === 'utm' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
