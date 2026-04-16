'use client';

// MIDAS — V7 §15 BLOC 2 : Programme Ambassadeur above the fold
// Carte glass premium dorée : paliers Bronze→Éternel (V7 §20), palier actuel surligné,
// barre progression, CTA "Postuler" vers /partenariat.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, Trophy, ArrowRight } from 'lucide-react';

interface TierDef {
  key: string;
  name: string;
  referrals: number;
  reward: number;
  icon: string;
}

// V7 CLAUDE.md §20 — Paliers Ambassadeur
const TIERS: TierDef[] = [
  { key: 'bronze', name: 'Bronze', referrals: 10, reward: 200, icon: '🥉' },
  { key: 'silver', name: 'Argent', referrals: 25, reward: 500, icon: '🥈' },
  { key: 'gold', name: 'Or', referrals: 50, reward: 1000, icon: '🥇' },
  { key: 'platinum', name: 'Platine', referrals: 100, reward: 2500, icon: '💎' },
  { key: 'diamond', name: 'Diamant', referrals: 250, reward: 6000, icon: '💠' },
  { key: 'legend', name: 'Légende', referrals: 500, reward: 12000, icon: '🏆' },
  { key: 'titan', name: 'Titan', referrals: 1000, reward: 25000, icon: '⚡' },
  { key: 'god', name: 'Dieu', referrals: 5000, reward: 100000, icon: '✨' },
  { key: 'eternal', name: 'Éternel', referrals: 10000, reward: 200000, icon: '♾️' },
];

function formatEUR(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} K€`;
  return `${n} €`;
}

export default function AmbassadeurBlock() {
  const [referralCount, setReferralCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/referral/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setReferralCount(typeof data?.count === 'number' ? data.count : 0);
      })
      .catch(() => {
        if (!cancelled) setReferralCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = referralCount ?? 0;

  const { currentTier, nextTier, progressPct } = useMemo(() => {
    let current: TierDef | null = null;
    let next: TierDef | null = TIERS[0];
    for (let i = 0; i < TIERS.length; i++) {
      if (count >= TIERS[i].referrals) {
        current = TIERS[i];
        next = TIERS[i + 1] ?? null;
      } else {
        next = TIERS[i];
        break;
      }
    }
    const prev = current?.referrals ?? 0;
    const target = next?.referrals ?? (current?.referrals ?? 1);
    const span = Math.max(1, target - prev);
    const done = Math.max(0, count - prev);
    const pct = next ? Math.min(100, (done / span) * 100) : 100;
    return { currentTier: current, nextTier: next, progressPct: pct };
  }, [count]);

  return (
    <section
      data-testid="ambassadeur-block"
      className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[var(--gold-primary)]/5 to-white/[0.02] backdrop-blur-xl p-5 min-h-[280px] flex flex-col"
    >
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-4 h-4 text-[var(--gold-primary)]" />
        <span className="text-xs uppercase tracking-wider text-[var(--gold-primary)] font-semibold">
          Programme Ambassadeur
        </span>
      </div>
      <h3 className="text-lg font-bold text-white mb-1">Deviens Ambassadeur MIDAS</h3>
      <p className="text-xs text-white/60 mb-3">
        Débloque jusqu&apos;à 200 000 € en primes de palier.
      </p>

      <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              {currentTier?.icon ?? '🎯'}
            </span>
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Palier actuel</div>
              <div className="text-sm font-bold text-white">
                {currentTier ? currentTier.name : 'Non classé'}
              </div>
            </div>
          </div>
          {nextTier && (
            <div className="text-right">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Prochain</div>
              <div className="text-sm font-semibold text-[var(--gold-primary)]">
                {formatEUR(nextTier.reward)}
              </div>
            </div>
          )}
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            data-testid="ambassadeur-progress"
            className="h-full bg-gradient-to-r from-[var(--gold-primary)] to-amber-400 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-white/50 tabular-nums">
          {count} / {nextTier?.referrals ?? currentTier?.referrals ?? 10} filleuls
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {TIERS.slice(0, 9).map((tier) => {
          const reached = count >= tier.referrals;
          return (
            <div
              key={tier.key}
              className={`rounded-lg border px-2 py-1.5 text-center ${
                reached
                  ? 'border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10'
                  : 'border-white/[0.05] bg-white/[0.02]'
              }`}
            >
              <div className="text-base leading-none mb-0.5" aria-hidden>
                {tier.icon}
              </div>
              <div
                className={`text-[9px] font-semibold ${reached ? 'text-[var(--gold-primary)]' : 'text-white/50'}`}
              >
                {formatEUR(tier.reward)}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/partenariat"
        data-testid="ambassadeur-cta"
        className="mt-auto min-h-[44px] rounded-xl border border-[var(--gold-primary)]/30 bg-black/30 hover:bg-[var(--gold-primary)]/10 transition-colors flex items-center justify-center gap-2 text-sm font-semibold text-[var(--gold-primary)]"
      >
        <Award className="w-4 h-4" />
        Postuler comme Ambassadeur
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
