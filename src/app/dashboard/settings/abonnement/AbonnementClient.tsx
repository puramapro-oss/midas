'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Pause, CreditCard, Sparkles, Loader2, ArrowRight, Shield } from 'lucide-react';
import { PLANS } from '@/lib/stripe/plans';
import { daysUntilWithdrawal } from '@/lib/phase';

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
  const [feedback, setFeedback] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  async function confirmCancel() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/stripe/portal?action=cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setMsg(data.error ?? 'Impossible pour l\'instant. Écris-nous à contact@purama.dev.');
    } catch {
      setMsg('Erreur réseau.');
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

      {/* Flow résiliation 3 étapes */}
      {cancelStep !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0A0A0F] p-6 space-y-4 shadow-2xl">
            {cancelStep === 1 && (
              <>
                <h3 className="text-xl font-bold text-white">Avant de partir…</h3>
                <div className="text-sm text-white/70 space-y-2">
                  <p>Tu vas perdre :</p>
                  <ul className="pl-5 space-y-1 list-disc text-white/80">
                    <li>
                      <strong className="text-amber-400">
                        {Number(profile.prime_total_credited ?? 0).toFixed(0)} €
                      </strong>{' '}
                      de prime (dont les tranches futures)
                    </li>
                    <li>
                      Ton streak de{' '}
                      <strong className="text-white">{profile.streak ?? 0} jour{(profile.streak ?? 0) > 1 ? 's' : ''}</strong>
                    </li>
                    <li>Les signaux IA premium et le trading auto</li>
                  </ul>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelStep(null)}
                    className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelStep(2)}
                    className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
                  >
                    Continuer
                  </button>
                </div>
              </>
            )}
            {cancelStep === 2 && (
              <>
                <h3 className="text-xl font-bold text-white">Et si tu mettais en pause ?</h3>
                <p className="text-sm text-white/70">
                  1 mois de pause — tu gardes ta prime, ton streak, et tu reprends quand tu veux.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-[#0A0A0F] px-4 py-2 text-sm font-semibold"
                  >
                    Mettre en pause
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelStep(3)}
                    className="flex-1 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-300"
                  >
                    Résilier quand même
                  </button>
                </div>
              </>
            )}
            {cancelStep === 3 && (
              <>
                <h3 className="text-xl font-bold text-white">Dis-nous pourquoi</h3>
                <p className="text-sm text-white/60">On s&apos;améliore grâce à toi.</p>
                <div className="space-y-2">
                  {['Trop cher', "Pas assez de gains", 'Autre app', 'Autre'].map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                        feedback === opt
                          ? 'border-amber-500/40 bg-amber-500/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="feedback"
                        value={opt}
                        checked={feedback === opt}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="sr-only"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
                {msg && <p className="text-sm text-red-300">{msg}</p>}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelStep(null)}
                    className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmCancel}
                    disabled={loading || !feedback}
                    className="flex-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-white/40 space-y-1">
        <p>Résiliation effective à la fin de la période de facturation.</p>
        <p>Données conservées 3 ans après résiliation (RGPD).</p>
      </div>
    </main>
  );
}
