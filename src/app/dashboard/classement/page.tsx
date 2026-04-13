'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Shield, TrendingUp, Clock, Award,
  Gift, Users, Ticket, Star, Loader2,
  AlertTriangle, Crown, ChevronRight,
} from 'lucide-react';

/* ─── Types ─── */

interface RankingEntry {
  pseudo: string;
  total_score: number;
  risk_score: number;
  regularity_score: number;
  preservation_score: number;
  loyalty_score: number;
  rank: number;
  prize_amount: number;
  is_me?: boolean;
}

interface RankingContest {
  id: string;
  month: number;
  year: number;
  status: string;
  prize_pool: number;
  total_participants: number;
  evaluated_at: string | null;
}

interface RankingData {
  currentRanking: RankingContest | null;
  top10: RankingEntry[];
  myRanking: RankingEntry | null;
  pastRankings: RankingContest[];
  currentMonth: number;
  currentYear: number;
}

interface Contest {
  id: string;
  type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  prize_pool: number;
  status: string;
  winners: { user_id: string; amount: number; rank: number }[];
}

interface ContestData {
  weekly: Contest | null;
  monthly: Contest | null;
  myWeeklyTickets: number;
  myMonthlyTickets: number;
  weeklyParticipants: number;
  pastContests: Contest[];
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/* ─── Helpers ─── */

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function getNextMonday(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  d.setHours(12, 0, 0, 0);
  return d;
}

function getEndOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 14, 0, 0, 0);
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 22, delay: i * 0.06 },
  }),
};

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl sm:text-2xl font-bold text-[#FFD700]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <span className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

function ScoreBar({ label, score, max, icon: Icon, color }: {
  label: string; score: number; max: number; icon: React.ComponentType<{ className?: string; color?: string }>; color: string;
}) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" color={color} />
          <span className="text-xs text-white/50">{label}</span>
        </div>
        <span className="text-xs font-bold text-white/70" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
          {score.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ─── Tab: Classement ─── */

function ClassementTab({ data }: { data: RankingData | null }) {
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

        {/* Countdown to evaluation */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 py-4 mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <CountdownUnit value={monthlyTimeLeft.days} label="Jours" />
          <span className="text-lg text-white/15">:</span>
          <CountdownUnit value={monthlyTimeLeft.hours} label="Heures" />
          <span className="text-lg text-white/15">:</span>
          <CountdownUnit value={monthlyTimeLeft.minutes} label="Min" />
          <span className="text-lg text-white/15">:</span>
          <CountdownUnit value={monthlyTimeLeft.seconds} label="Sec" />
        </div>

        <p className="text-[10px] text-white/30 text-center">
          Prochaine évaluation automatique des portefeuilles
        </p>
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
              <h3 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">
                Ta position
              </h3>
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

      {/* Criteria explanation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-3 font-[family-name:var(--font-orbitron)]">
          Critères d&apos;évaluation
        </h3>
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
          <h3 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">
            Top 10
          </h3>
        </div>

        {top10.length === 0 ? (
          <div className="py-8 text-center">
            <Trophy className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Évaluation en cours</p>
            <p className="text-xs text-white/20 mt-1">
              Le classement sera disponible à la fin du mois
            </p>
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
                  entry.is_me
                    ? 'bg-[#FFD700]/[0.08] border border-[#FFD700]/20'
                    : 'hover:bg-white/[0.02]'
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
                    <p className="text-[10px] text-white/25">
                      Score : {entry.total_score.toFixed(1)}/100
                    </p>
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
          <h3 className="text-sm font-semibold text-white mb-3 font-[family-name:var(--font-orbitron)]">
            Classements précédents
          </h3>
          <div className="space-y-2">
            {data.pastRankings.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                <div>
                  <p className="text-xs font-medium text-white/60">
                    {MONTH_NAMES[(r.month - 1) % 12]} {r.year}
                  </p>
                  <p className="text-[10px] text-white/25">
                    {r.total_participants} participants
                  </p>
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

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
}

/* ─── Tab: Récompenses ─── */

function RecompensesTab({ data }: { data: ContestData | null }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(getNextMonday()));

  useEffect(() => {
    const endDate = data?.weekly?.end_date ? new Date(data.weekly.end_date) : getNextMonday();
    setTimeLeft(getTimeLeft(endDate));
    const interval = setInterval(() => setTimeLeft(getTimeLeft(endDate)), 1000);
    return () => clearInterval(interval);
  }, [data?.weekly?.end_date]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  const prizePool = data.weekly?.prize_pool ?? 0;
  const myTickets = data.myWeeklyTickets ?? 0;
  const participants = data.weeklyParticipants ?? 0;
  const pastWinners = (data.pastContests ?? [])
    .filter((c) => c.winners?.length > 0)
    .flatMap((c) => c.winners.map((w) => ({
      contestType: c.type,
      amount: w.amount,
      rank: w.rank,
      date: c.end_date,
    })))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Active reward */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-transparent backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/15">
            <Gift className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">
              Récompense de la semaine
            </h2>
            <p className="text-xs text-white/40">Tirage au sort automatique chaque lundi</p>
          </div>
          {data.weekly ? (
            <span className="ml-auto text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              EN COURS
            </span>
          ) : (
            <span className="ml-auto text-[10px] font-bold text-white/30 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              PROCHAIN LUNDI
            </span>
          )}
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 py-4 mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <CountdownUnit value={timeLeft.days} label="Jours" />
          <span className="text-lg text-white/15">:</span>
          <CountdownUnit value={timeLeft.hours} label="Heures" />
          <span className="text-lg text-white/15">:</span>
          <CountdownUnit value={timeLeft.minutes} label="Min" />
          <span className="text-lg text-white/15">:</span>
          <CountdownUnit value={timeLeft.seconds} label="Sec" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Cagnotte', value: `${prizePool.toFixed(2)}€`, icon: Gift, color: '#10B981' },
            { label: 'Tes places', value: myTickets.toString(), icon: Ticket, color: '#A855F7' },
            { label: 'Participants', value: participants.toString(), icon: Users, color: '#06B6D4' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center"
            >
              <s.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: s.color }} />
              <p className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{s.value}</p>
              <p className="text-[10px] text-white/30">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-3 font-[family-name:var(--font-orbitron)]">
          Comment ça marche
        </h3>
        <div className="space-y-2.5">
          {[
            { icon: Users, text: 'Compte actif = participation automatique (1 place)', color: '#10B981' },
            { icon: Gift, text: 'Chaque parrainage = +1 place pour toi et ton filleul', color: '#FFD700' },
            { icon: Star, text: 'Abonnement Pro/Ultra = +2 places bonus', color: '#A855F7' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
              <item.icon className="w-4 h-4 shrink-0" style={{ color: item.color }} />
              <span className="text-xs text-white/50">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/25 mt-3">
          Aucune action requise. Si ton compte est actif, tu participes automatiquement.
        </p>
      </motion.div>

      {/* Past winners */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-3 font-[family-name:var(--font-orbitron)]">
          Dernières récompenses
        </h3>
        {pastWinners.length === 0 ? (
          <div className="py-6 text-center">
            <Gift className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Aucune récompense attribuée pour le moment</p>
            <p className="text-xs text-white/20 mt-1">Les tirages démarrent automatiquement chaque lundi</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {pastWinners.map((w, i) => (
              <motion.div
                key={`${w.date}-${w.rank}`}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/70">
                      {w.rank === 1 ? '1er' : `${w.rank}e`} tiré au sort
                    </p>
                    <p className="text-[10px] text-white/25">
                      {w.contestType === 'weekly' ? 'Hebdo' : 'Mensuel'} — {new Date(w.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 shrink-0" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  +{w.amount.toFixed(2)}€
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
}

/* ─── Disclaimer ─── */

function Disclaimer() {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
      <AlertTriangle className="w-4 h-4 text-amber-400/60 mt-0.5 shrink-0" />
      <p className="text-[10px] leading-relaxed text-white/35">
        Les performances passées ne préjugent pas des performances futures.
        Le trading comporte des risques de perte en capital.
        Ne jamais investir plus que ce que vous pouvez vous permettre de perdre.
      </p>
    </div>
  );
}

/* ─── Main Page ─── */

type Tab = 'classement' | 'recompenses';

export default function ClassementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('classement');
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [contestData, setContestData] = useState<ContestData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [rankingRes, contestRes] = await Promise.all([
        fetch('/api/ranking'),
        fetch('/api/contest'),
      ]);
      if (rankingRes.ok) {
        const r = await rankingRes.json();
        setRankingData(r);
      }
      if (contestRes.ok) {
        const c = await contestRes.json();
        setContestData(c);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-5" data-testid="classement-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          Classement & Récompenses
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Les portefeuilles les mieux protégés sont récompensés.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
        {([
          { key: 'classement' as Tab, label: 'Classement', icon: Trophy },
          { key: 'recompenses' as Tab, label: 'Récompenses', icon: Gift },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 rounded-lg bg-white/[0.06] border border-white/[0.08]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-[#FFD700]' : ''}`} />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'classement' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === 'classement' ? 12 : -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'classement' ? (
              <ClassementTab data={rankingData} />
            ) : (
              <RecompensesTab data={contestData} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
