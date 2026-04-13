'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Crown, Gem, Sparkles } from 'lucide-react';
import { MILESTONE_TIERS, TIER_THRESHOLDS, TIER_LABELS, TIER_COLORS } from '@/types/partnership';
import type { PartnerTier } from '@/types/partnership';

interface MilestoneTrackerProps {
  currentReferrals: number;
  currentTier: PartnerTier;
}

const TIER_ICONS: Record<PartnerTier, React.ElementType> = {
  bronze: Star,
  silver: Star,
  gold: Trophy,
  platinum: Crown,
  diamond: Gem,
  legend: Sparkles,
};

export default function MilestoneTracker({ currentReferrals, currentTier }: MilestoneTrackerProps) {
  const { nextTier, nextThreshold, progress } = useMemo(() => {
    const tiers = Object.entries(TIER_THRESHOLDS) as [PartnerTier, number][];
    const currentIndex = tiers.findIndex(([t]) => t === currentTier);
    const next = tiers[currentIndex + 1];

    if (!next) {
      return { nextTier: null, nextThreshold: 0, progress: 100 };
    }

    const currentThreshold = tiers[currentIndex][1];
    const progressPct = Math.min(
      100,
      ((currentReferrals - currentThreshold) / (next[1] - currentThreshold)) * 100
    );

    return { nextTier: next[0], nextThreshold: next[1], progress: progressPct };
  }, [currentReferrals, currentTier]);

  const nextMilestone = useMemo(() => {
    const milestones = Object.keys(MILESTONE_TIERS).map(Number).sort((a, b) => a - b);
    return milestones.find((m) => m > currentReferrals) ?? null;
  }, [currentReferrals]);

  const CurrentIcon = TIER_ICONS[currentTier];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
      {/* Current Tier */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: `${TIER_COLORS[currentTier]}20`, border: `1px solid ${TIER_COLORS[currentTier]}40` }}
        >
          <CurrentIcon className="w-7 h-7" style={{ color: TIER_COLORS[currentTier] }} />
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Votre palier actuel</p>
          <p className="text-xl font-bold" style={{ color: TIER_COLORS[currentTier], fontFamily: 'var(--font-orbitron)' }}>
            {TIER_LABELS[currentTier]}
          </p>
        </div>
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">
              Prochain palier : <span style={{ color: TIER_COLORS[nextTier] }}>{TIER_LABELS[nextTier]}</span>
            </span>
            <span className="text-[var(--text-secondary)]">
              {currentReferrals} / {nextThreshold}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(to right, ${TIER_COLORS[currentTier]}, ${TIER_COLORS[nextTier]})` }}
            />
          </div>
        </div>
      )}

      {/* Next milestone */}
      {nextMilestone && (
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Prochain bonus</p>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)] font-medium">
              {nextMilestone} filleuls
            </span>
            <span className="text-[var(--gold-primary)] font-bold">
              +{MILESTONE_TIERS[nextMilestone]} EUR
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Plus que {nextMilestone - currentReferrals} filleul{nextMilestone - currentReferrals > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* All tiers */}
      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Tous les paliers</p>
        {(Object.entries(TIER_THRESHOLDS) as [PartnerTier, number][]).map(([tier, threshold]) => {
          const Icon = TIER_ICONS[tier];
          const reached = currentReferrals >= threshold;
          return (
            <div
              key={tier}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                reached ? 'bg-white/5' : 'opacity-40'
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: reached ? TIER_COLORS[tier] : 'var(--text-tertiary)' }} />
              <span className="text-sm flex-1" style={{ color: reached ? TIER_COLORS[tier] : 'var(--text-tertiary)' }}>
                {TIER_LABELS[tier]}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {threshold}+ filleuls
              </span>
              {reached && (
                <span className="text-xs text-[var(--success)]">&#10003;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
