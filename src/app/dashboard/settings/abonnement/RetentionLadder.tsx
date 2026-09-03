'use client';

// RetentionLadder — échelle anti-résiliation MIDAS (RETENTION-BRIEF.md §2).
// Remplace CancelModal (3 écrans : pertes/pause/feedback, cancel délégué en partie
// au Portal). Ordre figé via @purama/retention : pertes > pause > palier (si ultra,
// D-MI02) > annuel > discount50 (si éligible) > feedback.

import { useEffect, useState } from 'react';
import { X, Heart, Loader2, Pause, TrendingDown, Flame } from 'lucide-react';
import type { RetentionStep } from '@purama/retention';

interface EligibilityData {
  steps: RetentionStep[];
  eligible: boolean;
  plan: 'free' | 'pro' | 'ultra';
  referrals: number;
}

interface Props {
  streakDays: number;
  onDone: () => void;
  onClose: () => void;
}

const FEEDBACK_OPTIONS = ['Trop cher', 'Pas assez de gains', 'Autre app', 'Autre'];

export default function RetentionLadder({ streakDays, onDone, onClose }: Props) {
  const [data, setData] = useState<EligibilityData | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetch('/api/stripe/retention/eligibility')
      .then((r) => r.json())
      .then((json) => setData(json.steps ? json : { steps: ['feedback'], eligible: false, plan: 'free', referrals: 0 }))
      .catch(() => setData({ steps: ['feedback'], eligible: false, plan: 'free', referrals: 0 }));
  }, []);

  const steps = data?.plan === 'ultra' ? data.steps : data?.steps.filter((s) => s !== 'palier');

  async function act(path: string, body?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Erreur. Réessaie.');
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur. Réessaie.');
      throw e;
    } finally {
      setBusy(false);
    }
  }

  function skipToFeedback() {
    if (!steps) return;
    setIndex(steps.indexOf('feedback'));
  }

  async function confirmCancel() {
    try {
      const r = await act('/api/stripe/retention/cancel', { reason });
      setResult(r.message ?? "Résiliation enregistrée. Accès conservé jusqu'à la fin de la période.");
    } catch {
      /* erreur déjà affichée */
    }
  }

  if (!steps) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  const step = result ? null : steps[index];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0A0A0F] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <Heart className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-white/40 hover:text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="text-center space-y-3 py-2">
            <p className="text-sm text-white/80 leading-relaxed">{result}</p>
            <button type="button" onClick={onDone} className="w-full rounded-lg bg-white/10 px-4 py-2 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <>
            {step === 'pertes' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Avant de partir…</h3>
                <div className="text-sm text-white/70 space-y-2">
                  <p>Tu vas perdre :</p>
                  <ul className="pl-5 space-y-1 list-disc text-white/80">
                    <li>Les signaux IA premium et le trading auto</li>
                    {streakDays > 0 && (
                      <li className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                        Ton streak de <strong>{streakDays} jour{streakDays > 1 ? 's' : ''}</strong>
                      </li>
                    )}
                    {data && data.referrals > 0 && (
                      <li className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 shrink-0" />
                        {data.referrals} filleul{data.referrals > 1 ? 's' : ''} parrainé{data.referrals > 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                </div>
                <button type="button" onClick={() => setIndex(index + 1)} className="w-full rounded-lg bg-white/10 px-4 py-2 text-sm text-white">Continuer</button>
              </div>
            )}

            {step === 'pause' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Et si tu mettais en pause ?</h3>
                <p className="text-sm text-white/70">Zéro prélèvement, tu gardes tout, reprends quand tu veux.</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((m) => (
                    <button key={m} type="button" disabled={busy} onClick={async () => { await act('/api/stripe/retention/pause', { months: m }); setResult(`Abonnement en pause pour ${m} mois. Zéro prélèvement.`); }} className="rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-2 py-2 text-sm text-white/90 flex items-center justify-center gap-1 disabled:opacity-50">
                      <Pause className="w-3.5 h-3.5" /> {m}m
                    </button>
                  ))}
                </div>
                {error && <p className="text-sm text-red-300">{error}</p>}
                <button type="button" onClick={() => setIndex(index + 1)} className="w-full text-xs text-white/50 hover:text-white/70">Non merci, continuer</button>
              </div>
            )}

            {step === 'palier' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Passer sur Pro ?</h3>
                <p className="text-sm text-white/70">Garde l&apos;essentiel de MIDAS pour moins cher, sans résilier.</p>
                <button type="button" disabled={busy} onClick={async () => { await act('/api/stripe/retention/palier'); setResult('Abonnement basculé sur Pro.'); }} className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-[#0A0A0F] px-4 py-2 text-sm font-semibold disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Passer sur Pro'}
                </button>
                {error && <p className="text-sm text-red-300">{error}</p>}
                <button type="button" onClick={() => setIndex(index + 1)} className="w-full text-xs text-white/50 hover:text-white/70">Non merci, continuer</button>
              </div>
            )}

            {step === 'annuel' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Passer à l&apos;annuel ?</h3>
                <p className="text-sm text-white/70">Prix verrouillé 12 mois, moins cher qu&apos;au mois.</p>
                <button type="button" disabled={busy} onClick={async () => { await act('/api/stripe/retention/annual'); setResult('Bascule annuelle appliquée — merci de rester !'); }} className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-[#0A0A0F] px-4 py-2 text-sm font-semibold disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Passer à l'annuel"}
                </button>
                {error && <p className="text-sm text-red-300">{error}</p>}
                <button type="button" onClick={() => setIndex(index + 1)} className="w-full text-xs text-white/50 hover:text-white/70">Non merci, continuer</button>
              </div>
            )}

            {step === 'discount50' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">-50% pendant 3 mois</h3>
                <p className="text-sm text-white/70">Ton abonnement actuel, divisé par 2, pendant 3 mois. Retour au tarif normal ensuite, automatiquement.</p>
                <button type="button" disabled={busy} onClick={async () => { const r = await act('/api/stripe/retention/discount50'); setResult(r.message); }} className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-[#0A0A0F] px-4 py-2 text-sm font-semibold disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "J'accepte -50% x 3 mois"}
                </button>
                {error && <p className="text-sm text-red-300">{error}</p>}
                <button type="button" onClick={() => setIndex(index + 1)} className="w-full text-xs text-white/50 hover:text-white/70">Non merci, continuer</button>
              </div>
            )}

            {step === 'feedback' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Dis-nous pourquoi</h3>
                <p className="text-sm text-white/60">On s&apos;améliore grâce à toi. Ton accès reste actif jusqu&apos;à la fin de la période.</p>
                <div className="space-y-2">
                  {FEEDBACK_OPTIONS.map((opt) => (
                    <label key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${reason === opt ? 'border-amber-500/40 bg-amber-500/10 text-white' : 'border-white/10 bg-white/[0.03] text-white/80'}`}>
                      <input type="radio" name="feedback" value={opt} checked={reason === opt} onChange={(e) => setReason(e.target.value)} className="sr-only" />
                      {opt}
                    </label>
                  ))}
                </div>
                {error && <p className="text-sm text-red-300">{error}</p>}
                <button type="button" disabled={busy || !reason} onClick={confirmCancel} className="w-full rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirmer la résiliation
                </button>
              </div>
            )}

            {step !== 'feedback' && (
              <button type="button" onClick={skipToFeedback} className="w-full text-center text-xs text-white/40 hover:text-white/60 underline underline-offset-2">
                Résilier quand même
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
