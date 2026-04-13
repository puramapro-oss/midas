'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, DollarSign, Zap, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Contest {
  id: string;
  type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  prize_pool: number;
  status: 'active' | 'completed' | 'cancelled';
  participants: number;
  winners: { name: string; amount: number }[];
}

export default function AdminContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState<string | null>(null);

  const fetchContests = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/contests');
      if (res.ok) {
        const data = await res.json();
        setContests(data.contests ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  const handleManualDraw = async (id: string) => {
    setDrawing(id);
    try {
      const res = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Tirage effectué — ${data.winners?.length ?? 0} gagnant(s)`);
        fetchContests();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Erreur lors du tirage');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDrawing(null);
    }
  };

  const active = contests.filter((c) => c.status === 'active');
  const completed = contests.filter((c) => c.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="admin-contests">
        <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-contests">
      <div>
        <h1 className="text-xl font-bold text-white font-[family-name:var(--font-orbitron)]">Concours</h1>
        <p className="text-sm text-white/40 mt-1">{active.length} en cours, {completed.length} terminés</p>
      </div>

      {/* Active */}
      {active.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60">En cours</h2>
          {active.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-emerald-500/15 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Trophy className={`w-5 h-5 ${c.type === 'weekly' ? 'text-[#FFD700]' : 'text-purple-400'}`} />
                  <div>
                    <h3 className="text-sm font-semibold text-white">{c.type === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}</h3>
                    <p className="text-[10px] text-white/30">{new Date(c.start_date).toLocaleDateString('fr-FR')} → {new Date(c.end_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">ACTIF</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                  <DollarSign className="w-4 h-4 text-[#FFD700] mx-auto mb-1" />
                  <p className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{Number(c.prize_pool).toFixed(2)}€</p>
                  <p className="text-[10px] text-white/30">Cagnotte</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                  <Users className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-white">{c.participants}</p>
                  <p className="text-[10px] text-white/30">Participants</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                  <Calendar className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-white">{Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000))}j</p>
                  <p className="text-[10px] text-white/30">Restant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleManualDraw(c.id)}
                disabled={drawing === c.id}
                className="w-full py-2 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-xs font-medium hover:bg-[#FFD700]/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                data-testid={`draw-${c.id}`}
              >
                {drawing === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Déclencher le tirage manuellement
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <Clock className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Aucun concours actif</p>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60">Terminés</h2>
          {completed.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-white/30" />
                  <span className="text-sm text-white">{c.type === 'weekly' ? 'Hebdo' : 'Mensuel'}</span>
                  <span className="text-xs text-white/30">{new Date(c.end_date).toLocaleDateString('fr-FR')}</span>
                </div>
                <span className="text-xs text-white/30" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{Number(c.prize_pool).toFixed(2)}€</span>
              </div>
              {c.winners && c.winners.length > 0 && (
                <div className="space-y-1">
                  {c.winners.map((w, i) => (
                    <div key={`${c.id}-${i}`} className="flex items-center justify-between text-xs py-1">
                      <span className="text-white/50">#{i + 1} {w.name}</span>
                      <span className="text-emerald-400 font-medium" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>+{Number(w.amount).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              )}
              {(!c.winners || c.winners.length === 0) && (
                <p className="text-xs text-white/20">Pas de gagnants enregistrés</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
