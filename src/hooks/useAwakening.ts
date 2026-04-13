'use client';

import { useMemo } from 'react';
import { AWAKENING_LEVELS, getAwakeningLevel } from '@/lib/spiritual/affirmations';
import type { Profile } from '@/types/database';

interface AwakeningState {
  level: number;
  name: string;
  xp: number;
  nextLevel: { name: string; minXp: number } | null;
  progress: number; // 0-100 progress to next level
  streak: number;
  shouldCelebrate: (prevXp: number, newXp: number) => boolean;
}

export function useAwakening(profile: Profile | null): AwakeningState {
  return useMemo(() => {
    const xp = profile?.xp_total ?? 0;
    const streak = profile?.streak_days ?? 0;
    const current = getAwakeningLevel(xp);

    const currentIdx = AWAKENING_LEVELS.findIndex(
      (l) => l.level === current.level,
    );
    const next =
      currentIdx < AWAKENING_LEVELS.length - 1
        ? AWAKENING_LEVELS[currentIdx + 1]
        : null;

    let progress = 100;
    if (next) {
      const currentMin = AWAKENING_LEVELS[currentIdx].minXp;
      const range = next.minXp - currentMin;
      progress = range > 0 ? Math.min(100, ((xp - currentMin) / range) * 100) : 100;
    }

    const shouldCelebrate = (prevXp: number, newXp: number): boolean => {
      const prevLevel = getAwakeningLevel(prevXp);
      const newLevel = getAwakeningLevel(newXp);
      return newLevel.level > prevLevel.level;
    };

    return {
      level: current.level,
      name: current.name,
      xp,
      nextLevel: next ? { name: next.name, minXp: next.minXp } : null,
      progress,
      streak,
      shouldCelebrate,
    };
  }, [profile?.xp_total, profile?.streak_days]);
}
