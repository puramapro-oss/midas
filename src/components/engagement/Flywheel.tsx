'use client';

// V6 §10 — Flywheel visible : X users actifs → Pool Y€ → +Z€/user

import { useEffect, useState } from 'react';
import { Users, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Flywheel() {
  const [data, setData] = useState<{ active: number; pool: number; per_user: number } | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        const active = Number(s?.users_active ?? 0);
        const pool = Number(s?.pool_balance ?? 0);
        const per_user = active > 0 ? pool / active : 0;
        setData({ active, pool, per_user });
      })
      .catch(() => setData({ active: 0, pool: 0, per_user: 0 }));
  }, []);

  if (!data) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/5 via-white/[0.02] to-amber-500/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Plus on est nombreux, plus chacun gagne</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-white/50 uppercase tracking-wider">Actifs</div>
          <div className="text-xl font-bold text-white tabular-nums flex items-center justify-center gap-1">
            <Users className="w-4 h-4 text-emerald-400" />
            {data.active.toLocaleString('fr-FR')}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/50 uppercase tracking-wider">Pool</div>
          <div className="text-xl font-bold text-white tabular-nums">{data.pool.toFixed(0)} €</div>
        </div>
        <div>
          <div className="text-xs text-white/50 uppercase tracking-wider">/user</div>
          <div className="text-xl font-bold text-amber-400 tabular-nums">
            +{data.per_user.toFixed(2)} €
          </div>
        </div>
      </div>
      <Link
        href="/dashboard/referral"
        className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
      >
        Inviter un ami <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
