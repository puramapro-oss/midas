'use client';

// MIDAS — V7 §15 BLOC 1 : Parrainage above the fold
// Carte glass dorée : lien unique /go/[code]?coupon=WELCOME50 + QR + compteur + share

import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Users, Share2, QrCode, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = 'https://midas.purama.dev';
const PER_REFERRAL_VALUE = 4.99;

export default function ReferralBlock() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [referralCount, setReferralCount] = useState<number | null>(null);

  const referralCode = profile?.referral_code ?? null;

  const shareUrl = useMemo(() => {
    if (!referralCode) return '';
    return `${BASE_URL}/go/${encodeURIComponent(referralCode)}?coupon=WELCOME50`;
  }, [referralCode]);

  useEffect(() => {
    if (!shareUrl) return;
    let cancelled = false;
    QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 200,
      color: { dark: '#FFD700', light: '#00000000' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/referral/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.count === 'number') {
          setReferralCount(data.count);
        } else if (!cancelled) {
          setReferralCount(0);
        }
      })
      .catch(() => {
        if (!cancelled) setReferralCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API refused — no-op
    }
  }

  async function handleShare() {
    if (!shareUrl) return;
    const shareData = {
      title: 'Rejoins MIDAS — Trading crypto IA',
      text: 'Utilise mon lien et reçois -50% + 100 € de prime de bienvenue.',
      url: shareUrl,
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed — fallback to copy
      }
    }
    void handleCopy();
  }

  const count = referralCount ?? 0;
  const cumulativeGains = count * PER_REFERRAL_VALUE;

  return (
    <section
      data-testid="referral-block"
      className="relative overflow-hidden rounded-2xl border border-[var(--gold-primary)]/20 bg-gradient-to-br from-[var(--gold-primary)]/10 via-white/[0.03] to-amber-500/5 backdrop-blur-xl p-5 min-h-[280px] flex flex-col"
    >
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-[var(--gold-primary)]" />
        <span className="text-xs uppercase tracking-wider text-[var(--gold-primary)] font-semibold">
          Parrainage
        </span>
      </div>
      <h3 className="text-lg font-bold text-white mb-1">Invite tes amis, gagne 50 % à vie</h3>
      <p className="text-xs text-white/60 mb-4">
        50 % sur le 1er mois + 10 % récurrent à vie par filleul actif 30 j.
      </p>

      {referralCode ? (
        <>
          <div className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 mb-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Ton lien</div>
              <div className="text-xs text-white/90 font-mono truncate" title={shareUrl}>
                {shareUrl.replace('https://', '')}
              </div>
            </div>
            <button
              onClick={handleCopy}
              type="button"
              aria-label="Copier le lien"
              className="min-w-[44px] min-h-[36px] rounded-lg bg-[var(--gold-primary)]/15 hover:bg-[var(--gold-primary)]/25 border border-[var(--gold-primary)]/30 transition-colors flex items-center justify-center text-[var(--gold-primary)]"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Filleuls</div>
              <div className="text-xl font-bold text-white tabular-nums">{count}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Gains cumulés</div>
              <div className="text-xl font-bold text-[var(--gold-primary)] tabular-nums">
                {cumulativeGains.toFixed(2)} €
              </div>
            </div>
          </div>

          {count === 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--gold-primary)] flex-shrink-0" />
              <p className="text-xs text-white/70">
                Ton premier filleul te rapporte <strong className="text-[var(--gold-primary)]">4,99 €/mois à vie</strong>.
              </p>
            </div>
          )}

          <div className="mt-auto flex items-center gap-2">
            <button
              onClick={handleShare}
              type="button"
              className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-amber-500 text-black font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"
            >
              <Share2 className="w-4 h-4" />
              Partager mon lien
            </button>
            <button
              onClick={() => setShowQR((v) => !v)}
              type="button"
              aria-label={showQR ? 'Masquer QR code' : 'Afficher QR code'}
              aria-expanded={showQR}
              className="min-w-[44px] min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-colors flex items-center justify-center text-white/70"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>

          {showQR && qrDataUrl && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl p-4">
              <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-4 flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR code du lien de parrainage MIDAS" width={200} height={200} />
                <button
                  onClick={() => setShowQR(false)}
                  type="button"
                  className="text-xs text-white/60 hover:text-white underline"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-white/50">
          Connecte-toi pour obtenir ton lien.
        </div>
      )}
    </section>
  );
}
