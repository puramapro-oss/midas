'use client';

// MIDAS — V7 §15 BLOC 3 : Cross-promo -50% + 100€ prime above the fold
// Carte glass : UNE SEULE app promue (mapping MIDAS→KASH prioritaire, puis JurisPurama),
// CTA vers /go/[source]?coupon=WELCOME50 côté app cible.

import { useEffect, useState } from 'react';
import { Gift, ArrowRight, Sparkles } from 'lucide-react';

interface Promo {
  slug: string;
  name: string;
  desc: string;
  color: string;
  relevance: string;
  url: string;
  coupon: string;
  discount: number;
  prime: number;
}

export default function CrossPromoBlock() {
  const [promo, setPromo] = useState<Promo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/cross-promo')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const first = Array.isArray(data?.promos) && data.promos.length > 0 ? data.promos[0] : null;
        if (first) setPromo(first as Promo);
        else setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function trackClick() {
    if (!promo) return;
    void fetch('/api/cross-promo/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_app: promo.slug, coupon: promo.coupon }),
    }).catch(() => undefined);
  }

  if (loading) {
    return (
      <section
        data-testid="cross-promo-block"
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 min-h-[280px] animate-pulse"
        aria-busy="true"
      >
        <div className="h-4 w-24 bg-white/10 rounded mb-3" />
        <div className="h-6 w-48 bg-white/10 rounded mb-2" />
        <div className="h-4 w-full bg-white/10 rounded mb-4" />
        <div className="h-12 w-full bg-white/10 rounded mt-auto" />
      </section>
    );
  }

  if (error || !promo) {
    return (
      <section
        data-testid="cross-promo-block"
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 min-h-[280px] flex flex-col"
      >
        <div className="flex items-center gap-2 mb-1">
          <Gift className="w-4 h-4 text-white/50" />
          <span className="text-xs uppercase tracking-wider text-white/50 font-semibold">
            Écosystème Purama
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Découvre l&apos;écosystème</h3>
        <p className="text-sm text-white/60 mb-4">
          Toutes les apps Purama t&apos;offrent -50 % + 100 € de prime de bienvenue.
        </p>
        <a
          href="https://midas.purama.dev/ecosystem"
          data-testid="cross-promo-cta"
          className="mt-auto min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center justify-center gap-2 text-sm font-semibold text-white"
        >
          Voir toutes les apps
          <ArrowRight className="w-4 h-4" />
        </a>
      </section>
    );
  }

  const accentColor = promo.color;

  return (
    <section
      data-testid="cross-promo-block"
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] backdrop-blur-xl p-5 min-h-[280px] flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${accentColor}1A 0%, rgba(255,255,255,0.02) 50%, ${accentColor}0D 100%)`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Gift className="w-4 h-4" style={{ color: accentColor }} />
        <span
          className="text-xs uppercase tracking-wider font-semibold"
          style={{ color: accentColor }}
        >
          Exclu ambassadeurs MIDAS
        </span>
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 text-white"
          style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}80 100%)` }}
          aria-hidden
        >
          {promo.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-white truncate">{promo.name}</h3>
          <p className="text-xs text-white/60 line-clamp-2">{promo.desc}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
          <span className="text-[11px] font-semibold text-white/90">
            -{promo.discount}% le 1er mois + {promo.prime} € de prime
          </span>
        </div>
        <p className="text-[11px] text-white/60 leading-relaxed">{promo.relevance}</p>
      </div>

      <p className="text-[10px] text-white/40 mb-3">
        Coupon <span className="font-mono text-white/60">{promo.coupon}</span> appliqué automatiquement.
      </p>

      <a
        href={promo.url}
        data-testid="cross-promo-cta"
        onClick={trackClick}
        className="mt-auto min-h-[44px] rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-black transition-all hover:brightness-110"
        style={{ background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}
      >
        Essayer {promo.name}
        <ArrowRight className="w-4 h-4" />
      </a>
    </section>
  );
}
