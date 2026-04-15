'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import Confetti from '@/components/shared/Confetti';

export default function ConfirmationClient({ plan }: { plan: string }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    // Tentative deep link mobile purama://activate
    if (typeof window !== 'undefined') {
      const timer = window.setTimeout(() => {
        try {
          window.location.href = 'purama://activate';
        } catch {
          // Silencieux — pas d'app mobile installée
        }
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#0A0A0F] relative overflow-hidden">
      <Confetti active={showConfetti} />

      <div className="max-w-lg w-full text-center relative z-10">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-white/[0.02] backdrop-blur-xl p-10 shadow-2xl">
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/40">
            <CheckCircle2 className="w-12 h-12 text-[#0A0A0F]" />
          </div>

          <h1 className="text-4xl font-bold text-white mb-3">Bienvenue chez MIDAS</h1>
          <p className="text-white/70 mb-8 leading-relaxed">
            Ton abonnement <strong className="text-amber-400 uppercase">{plan}</strong> est actif.
            On t&apos;a envoyé un email avec la confirmation et les CGV.
          </p>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 mb-8 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">Ta prime de bienvenue</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                <div className="text-xs text-amber-300/80">Aujourd&apos;hui</div>
                <div className="text-lg font-bold text-amber-400">25 €</div>
                <div className="text-[10px] text-white/40">créditée</div>
              </div>
              <div className="text-center rounded-lg bg-white/[0.03] border border-white/10 p-3">
                <div className="text-xs text-white/60">+ 1 mois</div>
                <div className="text-lg font-bold text-white/80">25 €</div>
                <div className="text-[10px] text-white/40">prévue</div>
              </div>
              <div className="text-center rounded-lg bg-white/[0.03] border border-white/10 p-3">
                <div className="text-xs text-white/60">+ 2 mois</div>
                <div className="text-lg font-bold text-white/80">50 €</div>
                <div className="text-[10px] text-white/40">prévue</div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-white/40 leading-snug">
              Crédits disponibles au retrait après 30 jours calendaires d&apos;abonnement actif.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-8 py-4 font-semibold text-[#0A0A0F] transition-all shadow-lg shadow-amber-500/20"
          >
            Entrer dans MIDAS
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
