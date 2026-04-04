'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Gift, Users, Clock, Ticket,
  Crown, Star, Award, Loader2,
} from 'lucide-react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 } as const,
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
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold text-[#FFD700]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <span className="text-[10px] text-white/30 uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

export default function ContestPage() {
  const [data, setData] = useState<ContestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchContest = useCallback(async () => {
    try {
      const res = await fetch('/api/contest');
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContest();
  }, [fetchContest]);

  // Countdown timer
  useEffect(() => {
    const endDate = data?.weekly?.end_date ? new Date(data.weekly.end_date) : getNextMonday();
    setTimeLeft(getTimeLeft(endDate));
    const interval = setInterval(() => setTimeLeft(getTimeLeft(endDate)), 1000);
    return () => clearInterval(interval);
  }, [data?.weekly?.end_date]);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="contest-page">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">Concours</h1>
          <p className="text-sm text-white/40 mt-1">Gagne de l&apos;argent chaque semaine, automatiquement.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
        </div>
      </div>
    );
  }

  const prizePool = data?.weekly?.prize_pool ?? 0;
  const myTickets = data?.myWeeklyTickets ?? 0;
  const participants = data?.weeklyParticipants ?? 0;
  const monthlyContest = data?.monthly;
  const pastContests = data?.pastContests ?? [];

  // Flatten winners from past contests
  const pastWinners = pastContests
    .filter((c) => c.winners && c.winners.length > 0)
    .flatMap((c) =>
      c.winners.map((w) => ({
        contestType: c.type,
        amount: w.amount,
        rank: w.rank,
        date: c.end_date,
      }))
    )
    .slice(0, 5);

  return (
    <div className="space-y-6" data-testid="contest-page">
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">Concours</h1>
        <p className="text-sm text-white/40 mt-1">Gagne de l&apos;argent chaque semaine, automatiquement.</p>
      </div>

      {/* Active contest */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="rounded-2xl border border-[#FFD700]/20 bg-gradient-to-br from-[#FFD700]/[0.06] to-transparent backdrop-blur-sm p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="p-2.5 rounded-xl bg-[#FFD700]/15"
          >
            <Trophy className="w-5 h-5 text-[#FFD700]" />
          </motion.div>
          <div>
            <h2 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">
              Concours de la semaine
            </h2>
            <p className="text-xs text-white/40">1 gagnant tiré au sort — cagnotte 2% du CA</p>
          </div>
          {data?.weekly ? (
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
        <div className="flex items-center justify-center gap-4 sm:gap-8 py-6 mb-5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <CountdownUnit value={timeLeft.days} label="Jours" />
          <span className="text-xl text-white/20">:</span>
          <CountdownUnit value={timeLeft.hours} label="Heures" />
          <span className="text-xl text-white/20">:</span>
          <CountdownUnit value={timeLeft.minutes} label="Min" />
          <span className="text-xl text-white/20">:</span>
          <CountdownUnit value={timeLeft.seconds} label="Sec" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Cagnotte', value: `${prizePool.toFixed(2)}€`, icon: Gift, color: '#FFD700' },
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
              <p className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{s.value}</p>
              <p className="text-[10px] text-white/30">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How to get tickets */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4 font-[family-name:var(--font-orbitron)]">
          Comment gagner des places
        </h3>
        <div className="space-y-3">
          {[
            { icon: Users, text: 'Inscription = 1 place automatique', color: '#10B981' },
            { icon: Gift, text: 'Chaque parrainage = +1 place pour toi ET ton filleul', color: '#FFD700' },
            { icon: Star, text: 'Abonnement Pro/Ultra = +2 places bonus', color: '#A855F7' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
              <item.icon className="w-4 h-4 shrink-0" style={{ color: item.color }} />
              <span className="text-xs text-white/60">{item.text}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Monthly contest */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <Crown className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">
            Concours mensuel
          </h3>
          {monthlyContest ? (
            <span className="ml-auto text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">EN COURS</span>
          ) : (
            <span className="ml-auto text-[10px] text-purple-400/80">1er du mois</span>
          )}
        </div>
        <p className="text-xs text-white/40 mb-3">
          3 gagnants : 60% / 25% / 15% — Cagnotte = 3% du CA mensuel (minimum 50€).
        </p>
        {monthlyContest ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-purple-400/70">
              <Gift className="w-3.5 h-3.5" />
              <span>Cagnotte : {Number(monthlyContest.prize_pool).toFixed(2)}€</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-400/70">
              <Ticket className="w-3.5 h-3.5" />
              <span>Tes places : {data?.myMonthlyTickets ?? 0}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-purple-400/70">
            <Clock className="w-3.5 h-3.5" />
            <span>Prochain tirage le 1er du mois</span>
          </div>
        )}
      </motion.div>

      {/* Past winners */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4 font-[family-name:var(--font-orbitron)]">
          Derniers gagnants
        </h3>
        {pastWinners.length === 0 ? (
          <div className="py-6 text-center">
            <Trophy className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Aucun gagnant pour le moment</p>
            <p className="text-xs text-white/20 mt-1">Les concours démarrent automatiquement chaque lundi</p>
          </div>
        ) : (
          <div className="space-y-2">
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
                  <Award className="w-4 h-4 text-[#FFD700] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white">
                      {w.rank === 1 ? '1er' : `${w.rank}e`} place
                    </p>
                    <p className="text-[10px] text-white/30">
                      {w.contestType === 'weekly' ? 'Hebdo' : 'Mensuel'} — {new Date(w.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-400 shrink-0" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  +{w.amount.toFixed(2)}€
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
