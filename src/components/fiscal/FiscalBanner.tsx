'use client';

// V6 §17 — Banner in-app si gains >3000€ (1er avril → 15 juin)

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, AlertCircle } from 'lucide-react';

const DISMISS_KEY = 'midas_fiscal_banner_dismissed_2026';

export default function FiscalBanner() {
  const [shown, setShown] = useState(false);
  const [totalGains, setTotalGains] = useState(0);

  useEffect(() => {
    // Entre 1er avril et 15 juin uniquement
    const now = new Date();
    const month = now.getMonth(); // 0-based : avril = 3, juin = 5
    const day = now.getDate();
    const inWindow =
      (month === 3) || (month === 4) || (month === 5 && day <= 15);
    if (!inWindow) return;

    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1') return;

    fetch('/api/wallet/prime')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // Fetch wallet + annual summary — minimal : si prime_total_credited > 3000 on banner
        // Sinon on tente un endpoint /api/tax/summary (V6 futur)
        const total = Number(d?.total_credited ?? 0);
        if (total >= 3000) {
          setTotalGains(total);
          setShown(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!shown) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
    setShown(false);
  }

  return (
    <div className="relative rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-amber-600/10 p-4 mb-4">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 text-white/50 hover:text-white"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-white text-sm">
            Tu as gagné plus de {Math.floor(totalGains).toLocaleString('fr-FR')} € cette année.
          </div>
          <p className="text-xs text-white/70 mt-1">
            Pense à déclarer via impots.gouv.fr → case 5NG. Abattement 34 % automatique.
          </p>
          <div className="flex gap-2 mt-2">
            <Link
              href="/dashboard/fiscal"
              className="text-xs rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-200 px-3 py-1 hover:bg-amber-500/30 transition"
            >
              En savoir plus
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs rounded-md border border-white/10 bg-white/5 text-white/70 px-3 py-1 hover:bg-white/10 transition"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
