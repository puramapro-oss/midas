'use client';

// V6 §19 — Phase 1 : Purama Card pas encore dispo. CardTeaser invite à la waitlist.

import { useEffect, useState } from 'react';
import { CreditCard, Lock, Bell, Check } from 'lucide-react';

export default function CardTeaser() {
  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [notified, setNotified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/wallet/card-waitlist')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.count != null) setWaitingCount(d.count);
        if (d?.notified) setNotified(true);
      })
      .catch(() => {});
  }, []);

  async function joinWaitlist() {
    setLoading(true);
    try {
      const r = await fetch('/api/wallet/card-waitlist', { method: 'POST' });
      if (r.ok) setNotified(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-white/[0.02] to-transparent p-6 overflow-hidden">
      {/* Card mockup grisée */}
      <div className="relative mx-auto mb-4 w-full max-w-xs aspect-[1.586/1] rounded-xl bg-gradient-to-br from-[#1a1a1f] via-[#2a2a2f] to-[#1a1a1f] border border-white/10 p-4 flex flex-col justify-between shadow-2xl">
        <div className="flex justify-between items-start">
          <span className="text-xs uppercase tracking-wider text-white/40">Purama Card</span>
          <Lock className="w-4 h-4 text-amber-400/80" />
        </div>
        <div>
          <div className="text-white/30 font-mono text-lg tracking-wider">•••• •••• •••• ••••</div>
          <div className="flex justify-between mt-2 text-[10px] text-white/30 uppercase">
            <span>Bientôt disponible</span>
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="font-semibold text-white">Purama Card — Bientôt disponible</h3>
        <p className="text-xs text-white/50">
          {waitingCount > 0 ? `${waitingCount} personne${waitingCount > 1 ? 's' : ''} attend${waitingCount > 1 ? 'ent' : ''}.` : 'Sois parmi les premiers.'}
        </p>

        {notified ? (
          <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-sm text-amber-300">
            <Check className="w-4 h-4" /> Tu seras notifié·e
          </div>
        ) : (
          <button
            type="button"
            onClick={joinWaitlist}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-sm text-amber-200 transition disabled:opacity-60"
          >
            <Bell className="w-4 h-4" />
            {loading ? 'Inscription…' : 'Me notifier en premier'}
          </button>
        )}
      </div>
    </div>
  );
}
