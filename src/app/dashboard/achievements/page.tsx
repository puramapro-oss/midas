'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Trophy, Lock, CheckCircle2 } from 'lucide-react';

const Confetti = dynamic(() => import('@/components/shared/Confetti'), { ssr: false });

interface AchievementData {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points_reward: number;
  xp_reward: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  trading: 'Trading',
  social: 'Social',
  learning: 'Apprentissage',
  streak: 'Régularité',
  milestone: 'Jalons',
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [total, setTotal] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetch('/api/achievements')
      .then(r => r.json())
      .then(data => {
        setAchievements(data.achievements ?? []);
        setTotal(data.total ?? 0);
        setUnlocked(data.unlocked_count ?? 0);
        if ((data.unlocked_count ?? 0) > 0) setShowConfetti(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(achievements.map(a => a.category))];
  const progressPct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <Confetti active={showConfetti} />
      {/* Header + Progress */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          Achievements
        </h1>
        <p className="text-white/50 mt-1">{unlocked}/{total} débloqués</p>
        <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* By category */}
      {categories.map(cat => (
        <div key={cat}>
          <h2 className="text-lg font-semibold text-white mb-4">{CATEGORY_LABELS[cat] ?? cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.filter(a => a.category === cat).map(ach => (
              <div
                key={ach.id}
                className={`glass rounded-xl p-5 transition-all ${
                  ach.unlocked ? 'border border-amber-500/30' : 'opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    ach.unlocked ? 'bg-amber-500/20' : 'bg-white/5'
                  }`}>
                    {ach.unlocked ? (
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Lock className="w-5 h-5 text-white/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">{ach.name}</h3>
                    <p className="text-white/50 text-xs mt-0.5">{ach.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-amber-400 text-xs">+{ach.points_reward} pts</span>
                      <span className="text-purple-400 text-xs">+{ach.xp_reward} XP</span>
                    </div>
                    {ach.unlocked && ach.unlocked_at && (
                      <p className="text-green-400/60 text-xs mt-1">
                        Débloqué le {new Date(ach.unlocked_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
