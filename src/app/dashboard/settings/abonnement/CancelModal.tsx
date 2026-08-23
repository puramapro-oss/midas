'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

type CancelStep = 1 | 2 | 3;

interface CancelModalProps {
  step: CancelStep;
  onClose: () => void;
  onNext: () => void;
  onOpenPortal: () => void;
  profile: {
    prime_total_credited: number | null;
    streak: number | null;
  };
  loading: boolean;
}

export default function CancelModal({
  step,
  onClose,
  onNext,
  onOpenPortal,
  profile,
  loading,
}: CancelModalProps) {
  const [feedback, setFeedback] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  async function confirmCancel() {
    setCanceling(true);
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
      setCanceling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0A0A0F] p-6 space-y-4 shadow-2xl">
        {step === 1 && (
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
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onNext}
                className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
              >
                Continuer
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h3 className="text-xl font-bold text-white">Et si tu mettais en pause ?</h3>
            <p className="text-sm text-white/70">
              1 mois de pause — tu gardes ta prime, ton streak, et tu reprends quand tu veux.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onOpenPortal}
                disabled={loading}
                className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-[#0A0A0F] px-4 py-2 text-sm font-semibold"
              >
                Mettre en pause
              </button>
              <button
                type="button"
                onClick={onNext}
                className="flex-1 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-300"
              >
                Résilier quand même
              </button>
            </div>
          </>
        )}
        {step === 3 && (
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
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={canceling || !feedback}
                className="flex-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {canceling && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
