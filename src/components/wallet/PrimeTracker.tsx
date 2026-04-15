'use client';

// V6 §10 — 3 tranches (J+0 25€ | M+1 25€ | M+2 50€) + retrait bloqué 30j

import { useEffect, useState } from 'react';
import { Sparkles, Lock, Check, Clock } from 'lucide-react';

interface Tranche {
  palier: number;
  amount: number;
  scheduled_for: string;
  credited_at: string | null;
  status: 'scheduled' | 'credited' | 'cancelled';
}

interface Data {
  tranches: Tranche[];
  subscription_started_at: string | null;
  total_credited: number;
  days_until_withdrawal: number;
}

export default function PrimeTracker() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch('/api/wallet/prime')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data || data.tranches.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-white">Ta prime de bienvenue</h3>
        </div>
        <div className="text-sm text-amber-400 font-semibold tabular-nums">
          {data.total_credited.toFixed(0)} € / 100 €
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {data.tranches.map((t) => {
          const icon =
            t.status === 'credited' ? (
              <Check className="w-3 h-3" />
            ) : t.status === 'cancelled' ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            );
          return (
            <div
              key={t.palier}
              className={`rounded-lg border p-3 text-center ${
                t.status === 'credited'
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : t.status === 'cancelled'
                    ? 'border-white/5 bg-white/[0.02] opacity-40'
                    : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                  t.status === 'credited' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/50'
                }`}
              >
                {icon}
                {t.palier === 1 ? 'J+0' : t.palier === 2 ? 'M+1' : 'M+2'}
              </div>
              <div
                className={`mt-2 text-lg font-bold tabular-nums ${
                  t.status === 'credited' ? 'text-amber-400' : 'text-white/70'
                }`}
              >
                {Number(t.amount).toFixed(0)} €
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 text-[11px] text-white/50">
        <Lock className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <div>
          {data.days_until_withdrawal > 0 ? (
            <>
              Retrait dans <strong className="text-amber-300">{data.days_until_withdrawal} jour{data.days_until_withdrawal > 1 ? 's' : ''}</strong>{' '}
              (30 jours d&apos;abonnement actif, art. L221-28).
            </>
          ) : (
            <>Retrait disponible (30 jours atteints).</>
          )}
        </div>
      </div>
    </div>
  );
}
