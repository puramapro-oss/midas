'use client';

import { Flame } from 'lucide-react';

interface Props {
  streak: number;
}

// V6 §10 — Streak multiplier badge
function getMultiplier(streak: number): number {
  if (streak >= 100) return 10;
  if (streak >= 60) return 7;
  if (streak >= 30) return 5;
  if (streak >= 14) return 3;
  if (streak >= 7) return 2;
  return 1;
}

export default function StreakCounter({ streak }: Props) {
  const mult = getMultiplier(streak);
  const intensity = Math.min(streak / 100, 1);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/10 px-3 py-1.5">
      <Flame
        className="w-4 h-4"
        style={{
          color: `hsl(${25 + intensity * 10}, 100%, ${50 + intensity * 10}%)`,
        }}
      />
      <span className="text-sm font-semibold text-white tabular-nums">{streak}j</span>
      {mult > 1 && (
        <span className="text-xs font-bold text-amber-400">×{mult}</span>
      )}
    </div>
  );
}
