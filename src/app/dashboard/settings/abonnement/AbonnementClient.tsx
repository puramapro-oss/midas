'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Pause, CreditCard, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { PLANS } from '@/lib/stripe/plans';
import { daysUntilWithdrawal } from '@/lib/phase';
import CancelModal from './CancelModal';

interface Profile {
  plan: string | null;
  billing_period: string | null;
  subscription_status: string | null;
  stripe_subscription_id: string | null;
  subscription_started_at: string | null;
  wallet_balance: number | null;
  prime_total_credited: number | null;
  streak: number | null;
}

interface Tranche {
  palier: number;
  amount: number;
  scheduled_for: string;
  credited_at: string | null;
  status: string;
}

type CancelStep = null | 1 | 2 | 3;

export default function AbonnementClient({
  profile,
  tranches,
}: {
  profile: Profile | null;
  tranches: Tranche[];
}) {
  const [cancelStep, setCancelStep] = useState<CancelStep>(null);
  const [loading, setLoading] = useState(false);

  if (!profile) {
    return (
      <main className="p-8 text-white/70">Chargement…</main>
    );
  }

  const plan = (profile.plan ?? 'free') as keyof typeof PLANS;
  const planCfg = PLANS[plan];
  const price = profile.billing_period === 'yearly' ? planCfg.price.yearly : planCfg.price.monthly;
  const isPaid = plan !== 'free' && profile.subscription_status === 'active';
  const daysLeft = daysUntilWithdrawal(profile.subscription_started_at);
  const withdrawalUnlocked = daysLeft === 0 && !!profile.subscription_started_at;

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Mon abonnement</h1>
        <p className="text-white/60 text-sm mt-1">Accès immédiat activé (art. L221-28).</p>
      </header>

      {/* Carte statut */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40">Plan actuel</div>
            <div className="text-2xl font-bold text-white mt-1">{planCfg.name}</div>
            <div className="text-sm text-white/60">
              {isPaid ? `${price} €${profile.billing_period === 'yearly' ? '/an' : '/mois'}` : 'Gratuit'}
              {profile.subscription_status && isPaid && (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] text-emerald-300">
                  {profile.subscription_status === 'active' ? 'Actif' : profile.subscription_status}
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
          <div className="grid md:grid-cols-3 gap-3 pt-4 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={openPortal}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-4 py-2 text-sm text-white/90 transition"
            >
              <Pause className="w-4 h-4" /> Pause 1 mois
            </button>
            <button
              type="button"
              onClick={openPortal}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-4 py-2 text-sm text-white/90 transition"
            >
              <CreditCard className="w-4 h-4" /> Changer plan
            </button>
            <button
              type="button"
              onClick={() => setCancelStep(1)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-4 py-2 text-sm text-red-300 transition"
            >
              <AlertTriangle className="w-4 h-4" /> Résilier
            </button>
          </div>
        )}
      </section>

      {/* Prime tranches */}
      {tranches.length > 0 && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-white">Prime de bienvenue</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {tranches.map((t) => (
              <div
                key={t.palier}
                className={`rounded-lg border p-4 ${
                  t.status === 'credited'
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : t.status === 'cancelled'
                      ? 'border-white/[0.05] bg-white/[0.02] opacity-50'
                      : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="text-[11px] uppercase tracking-wider text-white/50">
                  Palier {t.palier} {t.palier === 1 ? '(J+0)' : t.palier === 2 ? '(M+1)' : '(M+2)'}
                </div>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    t.status === 'credited' ? 'text-amber-400' : 'text-white/70'
                  }`}
                >
                  {Number(t.amount).toFixed(0)} €
                </div>
                <div className="text-[11px] text-white/40 mt-1">
                  {t.status === 'credited'
                    ? 'Créditée'
                    : t.status === 'cancelled'
                      ? 'Annulée'
                      : `Prévue ${new Date(t.scheduled_for).toLocaleDateString('fr-FR')}`}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-white/[0.05] bg-black/20 p-3 text-xs text-white/60 flex items-start gap-2">
            <Shield className="w-4 h-4 text-white/50 flex-shrink-0 mt-0.5" />
            <div>
              Crédits retirables après <strong className="text-white">30 jours</strong> d&apos;abonnement actif.
              {!withdrawalUnlocked && daysLeft > 0 && (
                <> Encore <strong className="text-amber-400">{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong>.</>
              )}
              {withdrawalUnlocked && <> Retrait disponible.</>}
            </div>
          </div>
        </section>
      )}

      {cancelStep !== null && (
        <CancelModal
          step={cancelStep}
          onClose={() => setCancelStep(null)}
          onNext={() => setCancelStep((s) => (s !== null && s < 3 ? ((s + 1) as CancelStep) : s))}
          onOpenPortal={openPortal}
          profile={profile}
          loading={loading}
        />
      )}

      <div className="text-xs text-white/40 space-y-1">
        <p>Résiliation effective à la fin de la période de facturation.</p>
        <p>Données conservées 3 ans après résiliation (RGPD).</p>
      </div>
    </main>
  );
}
