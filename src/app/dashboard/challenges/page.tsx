'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Trophy,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Target,
  Users,
  Loader2,
  Send,
} from 'lucide-react';

interface Challenge {
  id: string;
  challenger_id: string;
  challenged_contact: string;
  challenged_user_id: string | null;
  type: string;
  target: number;
  status: 'pending' | 'active' | 'completed' | 'expired';
  winner_id: string | null;
  created_at: string;
}

const CHALLENGE_TYPES = [
  { value: 'trades', label: 'Trades gagnants', icon: Target, description: 'Celui qui fait le plus de trades gagnants' },
  { value: 'pnl', label: 'Meilleur PnL', icon: Trophy, description: 'Celui qui a le meilleur PnL en %' },
  { value: 'streak', label: 'Streak', icon: Swords, description: 'Celui qui maintient la plus longue streak' },
];

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [contact, setContact] = useState('');
  const [type, setType] = useState('trades');
  const [target, setTarget] = useState(10);

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch('/api/challenges');
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleCreate = async () => {
    if (!contact.trim() || target < 1) return;
    setCreating(true);
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim(), type, target }),
      });
      if (res.ok) {
        setContact('');
        setTarget(10);
        setShowCreate(false);
        fetchChallenges();
      }
    } catch {
      /* silent */
    } finally {
      setCreating(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    pending: { label: 'En attente', color: 'text-amber-400', icon: Clock },
    active: { label: 'En cours', color: 'text-emerald-400', icon: Target },
    completed: { label: 'Termine', color: 'text-blue-400', icon: CheckCircle2 },
    expired: { label: 'Expire', color: 'text-red-400', icon: XCircle },
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Swords className="w-7 h-7 text-[var(--gold-primary)]" />
            Challenges
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Defie tes amis traders et prouve ta valeur
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-amber-600 text-black font-semibold text-sm hover:opacity-90 transition-opacity"
          data-testid="create-challenge-btn"
        >
          <Plus className="w-4 h-4" />
          Nouveau challenge
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Creer un challenge</h3>

              {/* Type selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CHALLENGE_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setType(ct.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      type === ct.value
                        ? 'border-[var(--gold-primary)] bg-[var(--gold-muted)]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <ct.icon className={`w-5 h-5 mb-2 ${type === ct.value ? 'text-[var(--gold-primary)]' : 'text-[var(--text-secondary)]'}`} />
                    <p className="text-sm font-medium text-[var(--text-primary)]">{ct.label}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{ct.description}</p>
                  </button>
                ))}
              </div>

              {/* Contact + Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Email ou pseudo de ton adversaire</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="ami@email.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--gold-primary)] focus:outline-none"
                    data-testid="challenge-contact-input"
                  />
                </div>
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Objectif</label>
                  <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none font-mono"
                    data-testid="challenge-target-input"
                  />
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={creating || !contact.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-amber-600 text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                data-testid="submit-challenge-btn"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer le defi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenges list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--gold-primary)]" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 text-[var(--text-secondary)]/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Aucun challenge</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Lance ton premier defi a un ami trader !
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((c, i) => {
            const cfg = statusConfig[c.status] ?? statusConfig.pending;
            const StatusIcon = cfg.icon;
            const typeInfo = CHALLENGE_TYPES.find((ct) => ct.value === c.type);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  {typeInfo ? <typeInfo.icon className="w-5 h-5 text-[var(--gold-primary)]" /> : <Swords className="w-5 h-5 text-[var(--gold-primary)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {typeInfo?.label ?? c.type} — Objectif : {c.target}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    vs {c.challenged_contact}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {cfg.label}
                </div>
                <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                  {new Date(c.created_at).toLocaleDateString('fr-FR')}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
