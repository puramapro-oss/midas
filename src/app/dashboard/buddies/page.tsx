'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Flame,
  Send,
  Loader2,
  UserPlus,
  Heart,
} from 'lucide-react';

interface BuddyProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  streak_days: number;
  level: number;
}

interface Checkin {
  id: string;
  sender_id: string;
  message: string;
  mood_emoji: string | null;
  created_at: string;
}

interface BuddyPair {
  id: string;
  user_a: string;
  user_b: string;
  streak_days: number;
  status: string;
  matched_at: string;
  buddy_profile: BuddyProfile | null;
  checkins: Checkin[];
}

const MOODS = ['😊', '🔥', '📈', '😤', '🧘', '💪', '🎯', '😴'];

export default function BuddiesPage() {
  const [buddies, setBuddies] = useState<BuddyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedMood, setSelectedMood] = useState('😊');
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const fetchBuddies = useCallback(async () => {
    try {
      const res = await fetch('/api/community/buddy');
      if (res.ok) {
        const data = await res.json();
        setBuddies(data.buddies ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuddies();
  }, [fetchBuddies]);

  const handleCheckin = async (buddyPairId: string) => {
    if (!message.trim() || sendingTo) return;
    setSendingTo(buddyPairId);
    try {
      const res = await fetch('/api/community/buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buddy_pair_id: buddyPairId,
          message: message.trim(),
          mood_emoji: selectedMood,
        }),
      });
      if (res.ok) {
        setMessage('');
        fetchBuddies();
      }
    } catch {
      /* silent */
    } finally {
      setSendingTo(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold-primary)]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Users className="w-7 h-7 text-[var(--gold-primary)]" />
          Buddy Trading
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Un partenaire pour rester discipline et motivé
        </p>
      </div>

      {buddies.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <UserPlus className="w-12 h-12 text-[var(--text-secondary)]/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Pas encore de buddy</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
            Le matching IA te trouvera un partenaire de trading avec des objectifs similaires. Reviens bientot !
          </p>
        </div>
      ) : (
        buddies.map((pair) => (
          <motion.div
            key={pair.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
          >
            {/* Buddy header */}
            <div className="p-5 flex items-center gap-4 border-b border-white/[0.06]">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--gold-primary)] to-amber-600 flex items-center justify-center text-black font-bold text-lg">
                {pair.buddy_profile?.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  {pair.buddy_profile?.full_name ?? 'Buddy'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Niveau {pair.buddy_profile?.level ?? 1}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <Flame className="w-4 h-4" />
                <span className="text-sm font-bold font-mono">{pair.streak_days}j</span>
              </div>
            </div>

            {/* Checkins */}
            <div className="p-4 space-y-3 max-h-[200px] overflow-y-auto">
              {pair.checkins.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  Envoie ton premier check-in !
                </p>
              ) : (
                pair.checkins.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <span className="text-lg">{c.mood_emoji ?? '💬'}</span>
                    <div className="flex-1">
                      <p className="text-sm text-[var(--text-primary)]">{c.message}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {new Date(c.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Send checkin */}
            <div className="p-4 border-t border-white/[0.06] space-y-3">
              {/* Mood selector */}
              <div className="flex gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMood(m)}
                    className={`text-lg p-1 rounded-lg transition-all ${selectedMood === m ? 'bg-white/[0.1] scale-110' : 'opacity-50 hover:opacity-100'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Comment va ton trading aujourd'hui ?"
                  maxLength={200}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--gold-primary)] focus:outline-none text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckin(pair.id)}
                  data-testid="buddy-checkin-input"
                />
                <button
                  onClick={() => handleCheckin(pair.id)}
                  disabled={!message.trim() || sendingTo === pair.id}
                  className="shrink-0 p-2.5 rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-amber-600 text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                  data-testid="send-checkin"
                >
                  {sendingTo === pair.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        ))
      )}

      {/* Info card */}
      <div className="glass-card p-5">
        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Comment ca marche</p>
            <ul className="text-xs text-[var(--text-secondary)] mt-2 space-y-1">
              <li>Le matching IA te trouve un partenaire avec des objectifs similaires</li>
              <li>Check-in quotidien pour maintenir la streak</li>
              <li>Points doubles (x2) pour les duos actifs</li>
              <li>30 jours de streak = recompense speciale</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
