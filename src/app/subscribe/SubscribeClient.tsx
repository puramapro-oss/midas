'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Shield, Zap, ArrowRight } from 'lucide-react';
import { PLANS } from '@/lib/stripe/plans';

interface Props {
  plan: 'pro' | 'ultra';
  period: 'monthly' | 'yearly';
}

export default function SubscribeClient({ plan, period }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg = PLANS[plan];
  const price = cfg.price[period];

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, period }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?next=/subscribe?plan=${plan}&period=${period}`);
          return;
        }
        throw new Error(data.error ?? 'Impossible de démarrer la souscription.');
      }
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#0A0A0F]">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-sm uppercase tracking-wider text-amber-400 font-semibold">
              Prime de bienvenue
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">
            Ta prime de 100 € t&apos;attend.
          </h1>
          <p className="text-white/70 mb-8 leading-relaxed">
            Elle est créditée sur ton compte MIDAS en 3 paliers : <strong className="text-white">25 €
            aujourd&apos;hui</strong>, 25 € dans 1 mois, 50 € dans 2 mois.
          </p>

          <div className="mb-6 rounded-xl border border-white/[0.08] bg-black/20 p-4">
            <div className="flex justify-between items-baseline">
              <div>
                <div className="text-sm text-white/60">Plan {cfg.name}</div>
                <div className="text-xs text-white/40">{period === 'yearly' ? 'Facturation annuelle' : 'Facturation mensuelle'}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{price} €</div>
                <div className="text-xs text-white/40">{period === 'yearly' ? '/an' : '/mois'}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-8 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Accès immédiat à toutes les fonctionnalités</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Paiement sécurisé via Stripe · 3D Secure</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="w-full group rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-6 py-4 font-semibold text-[#0A0A0F] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>Chargement…</>
            ) : (
              <>
                Démarrer &amp; recevoir ma prime
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* Mention L221-28 OBLIGATOIRE — small, muted, sous bouton (V6 §10) */}
          <p className="mt-4 text-[11px] leading-snug text-white/40 text-center">
            En démarrant maintenant, tu bénéficies d&apos;un accès immédiat à ton abonnement
            (art. L221-28 Code conso).
          </p>
        </div>
      </div>
    </main>
  );
}
