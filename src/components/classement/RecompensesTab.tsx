import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Users, Ticket, Star, Loader2, Award } from 'lucide-react';
import { ContestData } from '@/lib/classement/types';
import { getTimeLeft, getNextMonday, fadeUp, type TimeLeft } from '@/lib/classement/helpers';
import CountdownUnit from './CountdownUnit';
import Disclaimer from './Disclaimer';

export default function RecompensesTab({ data }: { data: ContestData | null }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(getNextMonday()));

  useEffect(() => {
    const endDate = data?.weekly?.end_date ? new Date(data.weekly.end_date) : getNextMonday();
    queueMicrotask(() => setTimeLeft(getTimeLeft(endDate)));
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
            <h2 className="text-sm font-semibold text-white font-[family-name:var(--font-orbitron)]">Récompense de la semaine</h2>
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
        <h3 className="text-sm font-semibold text-white mb-3 font-[family-name:var(--font-orbitron)]">Comment ça marche</h3>
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
        <p className="text-[10px] text-white/25 mt-3">Aucune action requise. Si ton compte est actif, tu participes automatiquement.</p>
      </motion.div>

      {/* Past winners */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-3 font-[family-name:var(--font-orbitron)]">Dernières récompenses</h3>
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

      <Disclaimer />
    </div>
  );
}
