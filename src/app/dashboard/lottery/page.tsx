'use client';

import { useEffect, useState } from 'react';
import { Ticket, Gift, Trophy, Clock, Star } from 'lucide-react';

interface DrawData {
  id: string;
  draw_date: string;
  pool_amount: number;
  status: string;
}

interface TicketData {
  id: string;
  source: string;
  created_at: string;
}

interface WinData {
  id: string;
  rank: number;
  amount_won: number;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  inscription: 'Inscription',
  parrainage: 'Parrainage',
  mission: 'Mission',
  partage: 'Partage',
  note: 'Avis store',
  challenge: 'Challenge',
  streak: 'Streak',
  abo: 'Abonnement',
  achat_points: 'Achat points',
};

export default function LotteryPage() {
  const [currentDraw, setCurrentDraw] = useState<DrawData | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [wins, setWins] = useState<WinData[]>([]);
  const [pastDraws, setPastDraws] = useState<DrawData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/lottery')
      .then(r => r.json())
      .then(data => {
        setCurrentDraw(data.current_draw);
        setTickets(data.my_tickets ?? []);
        setTicketCount(data.my_tickets_count ?? 0);
        setWins(data.my_wins ?? []);
        setPastDraws(data.past_draws ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  const timeUntilDraw = currentDraw
    ? Math.max(0, new Date(currentDraw.draw_date).getTime() - Date.now())
    : 0;
  const daysLeft = Math.floor(timeUntilDraw / 86400000);
  const hoursLeft = Math.floor((timeUntilDraw % 86400000) / 3600000);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gift className="w-6 h-6 text-purple-400" />
          Tirage Mensuel
        </h1>
        <p className="text-white/50 mt-1">10 gagnants chaque mois — 4% du CA redistribué</p>
      </div>

      {/* Current Draw */}
      {currentDraw && (
        <div className="glass rounded-xl p-6 border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Prochain tirage</h2>
            <div className="flex items-center gap-1 text-purple-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{daysLeft}j {hoursLeft}h</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-white/50 text-xs">Cagnotte</p>
              <p className="text-2xl font-bold text-amber-400">{currentDraw.pool_amount?.toFixed(2) ?? '0.00'}€</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-white/50 text-xs">Tes tickets</p>
              <p className="text-2xl font-bold text-white">{ticketCount}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center md:col-span-1 col-span-2">
              <p className="text-white/50 text-xs">Date du tirage</p>
              <p className="text-lg font-bold text-white">
                {new Date(currentDraw.draw_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {/* How to get tickets */}
          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <p className="text-white/60 text-xs font-medium mb-2">Comment gagner des tickets :</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[
                { label: 'Inscription', val: '+1' },
                { label: 'Parrainage', val: '+2' },
                { label: 'Partage', val: '+1' },
                { label: 'Streak 7j', val: '+1' },
                { label: 'Streak 30j', val: '+5' },
                { label: 'Abo actif', val: '+5/mois' },
                { label: '500 pts', val: '= 1 ticket' },
                { label: 'Avis store', val: '+3' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between bg-white/5 rounded px-2 py-1">
                  <span className="text-white/40">{item.label}</span>
                  <span className="text-amber-400 font-medium">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My Tickets */}
      {tickets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-purple-400" />
            Mes tickets ({ticketCount})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {tickets.slice(0, 12).map(t => (
              <div key={t.id} className="glass rounded-lg p-3 text-center">
                <Ticket className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-white/50 text-xs">{SOURCE_LABELS[t.source] ?? t.source}</p>
              </div>
            ))}
            {ticketCount > 12 && (
              <div className="glass rounded-lg p-3 text-center flex items-center justify-center">
                <span className="text-white/40 text-sm">+{ticketCount - 12} autres</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wins */}
      {wins.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            Mes gains
          </h2>
          <div className="space-y-2">
            {wins.map(w => (
              <div key={w.id} className="glass rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-amber-400" />
                  <span className="text-white">#{w.rank}</span>
                </div>
                <span className="text-green-400 font-bold">+{w.amount_won.toFixed(2)}€</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Draws */}
      {pastDraws.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Tirages passés</h2>
          <div className="space-y-2">
            {pastDraws.map(d => (
              <div key={d.id} className="glass rounded-lg p-3 flex items-center justify-between">
                <span className="text-white/60 text-sm">
                  {new Date(d.draw_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
                <span className="text-amber-400 text-sm font-medium">{d.pool_amount?.toFixed(2)}€ distribués</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!currentDraw && pastDraws.length === 0 && (
        <div className="text-center py-16">
          <Gift className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Le premier tirage sera bientôt annoncé !</p>
        </div>
      )}
    </div>
  );
}
