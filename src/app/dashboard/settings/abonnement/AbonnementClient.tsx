'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CreditCard, ArrowRight } from 'lucide-react';
import { PLANS } from '@/lib/stripe/plans';
import RetentionLadder from './RetentionLadder';

interface Profile {
  plan: string;
  planPeriod: string;
  streakDays: number;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export default function AbonnementClient({ profile }: { profile: Profile | null }) {
  const [ladderOpen, setLadderOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  if (!profile) {
    return (
      <main className="p-8 text-white/70">Chargement…</main>
    );
  }

  const plan = (profile.plan ?? 'free') as keyof typeof PLANS;
  const planCfg = PLANS[plan];
  const period = profile.planPeriod === 'yearly' ? 'yearly' : 'monthly';
  const price = planCfg.price[period];
  const isPaid = plan !== 'free' && (profile.subscriptionStatus === 'active' || profile.subscriptionStatus === 'trialing');

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Mon abonnement</h1>
        <p className="text-white/60 text-sm mt-1">Accès immédiat activé (art. L221-28).</p>
      </header>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40">Plan actuel</div>
            <div className="text-2xl font-bold text-white mt-1">{planCfg.name}</div>
            <div className="text-sm text-white/60">
              {isPaid ? `${price} €${period === 'yearly' ? '/an' : '/mois'}` : 'Gratuit'}
              {isPaid && (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] text-emerald-300">
                  {profile.cancelAtPeriodEnd ? 'Se termine en fin de période' : 'Actif'}
                </span>
              )}
            </div>
          </div>

          {!isPaid && (
            <Link
              href="/subscribe?plan=pro&period=monthly"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-[#0A0A0F] px-4 py-2 text-sm font-semibold"
            >
              Passer à Pro <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {isPaid && (
          <div className="grid md:grid-cols-2 gap-3 pt-4 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-4 py-2 text-sm text-white/90 transition"
            >
              <CreditCard className="w-4 h-4" /> Gérer le paiement
            </button>
            {!profile.cancelAtPeriodEnd && (
              <button
                type="button"
                onClick={() => setLadderOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-4 py-2 text-sm text-red-300 transition"
              >
                <AlertTriangle className="w-4 h-4" /> Résilier
              </button>
            )}
          </div>
        )}
      </section>

      {ladderOpen && (
        <RetentionLadder
          streakDays={profile.streakDays}
          onClose={() => setLadderOpen(false)}
          onDone={() => window.location.reload()}
        />
      )}

      <div className="text-xs text-white/40 space-y-1">
        <p>Résiliation effective à la fin de la période de facturation.</p>
        <p>Données conservées 3 ans après résiliation (RGPD).</p>
      </div>
    </main>
  );
}
