import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Shield, TrendingUp, Clock, Award, Crown, ChevronRight, Star, Loader2 } from 'lucide-react';
import { RankingData } from '@/lib/classement/types';
import { MONTH_NAMES, getTimeLeft, getEndOfMonth, fadeUp, type TimeLeft } from '@/lib/classement/helpers';
import CountdownUnit from './CountdownUnit';
import ScoreBar from './ScoreBar';
import Disclaimer from './Disclaimer';

export default function ClassementTab({ data }: { data: RankingData | null }) {
  const [monthlyTimeLeft, setMonthlyTimeLeft] = useState<TimeLeft>(getTimeLeft(getEndOfMonth()));

  useEffect(() => {
    const interval = setInterval(() => setMonthlyTimeLeft(getTimeLeft(getEndOfMonth())), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  const { currentRanking, top10, myRanking } = data;
  const monthName = MONTH_NAMES[(data.currentMonth - 1) % 12];

  return (
    <div className="space-y-5">
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="rounded-2xl border border-[#FFD700]/20 bg-gradient-to-br from-[#FFD700]/[0.06] to-transparent backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-[#FFD700]/15">
            <Trophy className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">
              Classement {monthName} {data.currentYear}
            </h2>
            <p className="text-xs text-white/40">Les portefeuilles les mieux protégés</p>
          </div>
          {currentRanking?.status === 'active' && (
            <span className="ml-auto text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              EN COURS
            </span>
          )}
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 py-4 mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <CountdownUnit value={monthlyTimeLeft.days} label="Jours" />
          <span className="text-lg text-white/15">:</span>
          <CountdownUnit value={monthlyTimeLeft.hours} label="Heures" />
          <span className="text-lg text-white/15">:</span>
          <CountdownUnit value={monthlyTimeLeft.minutes} label="Min" />
          <span className="text-lg text-white/15">:</span>
          <CountdownUnit value={monthlyTimeLeft.seconds} label="Sec" />
        </div>

        <p className="text-[10px] text-white/30 text-center">Prochaine évaluation automatique des portefeuilles</p>
      </motion.div>

      {/* My ranking */}
      {myRanking && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-[#FFD700]/15 bg-[#FFD700]/[0.04] backdrop-blur-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FFD700]" />
              <h3 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">Ta position</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#FFD700]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                #{myRanking.rank}
              </span>
              <span className="text-xs text-white/30">/ {currentRanking?.total_participants ?? '—'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <ScoreBar label="Performance ajustée au risque" score={myRanking.risk_score} max={30} icon={TrendingUp} color="#10B981" />
            <ScoreBar label="Régularité des gains" score={myRanking.regularity_score} max={25} icon={Star} color="#3B82F6" />
            <ScoreBar label="Préservation du capital" score={myRanking.preservation_score} max={25} icon={Shield} color="#A855F7" />
            <ScoreBar label="Fidélité et utilisation" score={myRanking.loyalty_score} max={20} icon={Clock} color="#F59E0B" />
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-white/40">Score total</span>
            <span className="text-lg font-bold text-[#FFD700]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {myRanking.total_score.toFixed(1)} / 100
            </span>
          </div>
        </motion.div>
      )}

      {/* Criteria */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-3 font-[family-name:var(--font-orbitron)]">Critères d&apos;évaluation</h3>
        <div className="space-y-2.5">
          {[
            { icon: TrendingUp, label: 'Performance ajustée au risque', pts: '30 pts', desc: 'Ratio de Sharpe, drawdown max contrôlé', color: '#10B981' },
            { icon: Star, label: 'Régularité des gains', pts: '25 pts', desc: 'Courbe de performance stable, pas de crash', color: '#3B82F6' },
            { icon: Shield, label: 'Préservation du capital', pts: '25 pts', desc: 'MIDAS SHIELD actif, pertes limitées', color: '#A855F7' },
            { icon: Clock, label: 'Fidélité et utilisation', pts: '20 pts', desc: 'Ancienneté, configuration optimisée', color: '#F59E0B' },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
              <c.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: c.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/70">{c.label}</span>
                  <span className="text-[10px] font-bold text-white/40 shrink-0 ml-2">{c.pts}</span>
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top 10 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-[#FFD700]" />
          <h3 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">Top 10</h3>
        </div>

        {top10.length === 0 ? (
          <div className="py-8 text-center">
            <Trophy className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Évaluation en cours</p>
            <p className="text-xs text-white/20 mt-1">Le classement sera disponible à la fin du mois</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {top10.map((entry, i) => (
              <motion.div
                key={entry.pseudo}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                  entry.is_me ? 'bg-[#FFD700]/[0.08] border border-[#FFD700]/20' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-7 text-center text-sm font-bold ${
                    i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-white/30'
                  }`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${entry.rank}`}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${entry.is_me ? 'text-[#FFD700]' : 'text-white/70'}`}>
                      {entry.pseudo} {entry.is_me && '(toi)'}
                    </p>
                    <p className="text-[10px] text-white/25">Score : {entry.total_score.toFixed(1)}/100</p>
                  </div>
                </div>
                {entry.prize_amount > 0 && (
                  <span className="text-xs font-bold text-emerald-400 shrink-0" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    +{entry.prize_amount.toFixed(2)}€
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Past rankings */}
      {data.pastRankings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-3 font-[family-name:var(--font-orbitron)]">Classements précédents</h3>
          <div className="space-y-2">
            {data.pastRankings.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                <div>
                  <p className="text-xs font-medium text-white/60">
                    {MONTH_NAMES[(r.month - 1) % 12]} {r.year}
                  </p>
                  <p className="text-[10px] text-white/25">{r.total_participants} participants</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {Number(r.prize_pool).toFixed(0)}€
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <Disclaimer />
    </div>
  );
}
