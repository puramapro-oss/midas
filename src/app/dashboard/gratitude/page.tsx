'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Plus,
  Loader2,
  Sparkles,
  Calendar,
  Award,
  Send,
} from 'lucide-react';

interface GratitudeEntry {
  id: string;
  user_id: string;
  content: string;
  tagged_user_id: string | null;
  created_at: string;
}

export default function GratitudePage() {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/gratitude');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setContent('');
        setPointsEarned(data.points_earned);
        setTimeout(() => setPointsEarned(null), 3000);
        fetchEntries();
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  };

  const prompts = [
    'Un trade qui m\'a appris quelque chose...',
    'Une personne qui m\'a aide dans mon parcours...',
    'Un moment ou j\'ai fait confiance a mon analyse...',
    'Ce qui me motive a continuer chaque jour...',
    'Une erreur qui m\'a rendu meilleur trader...',
  ];

  const todayPrompt = prompts[new Date().getDay() % prompts.length];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Heart className="w-7 h-7 text-rose-400" />
          Journal de Gratitude
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Cultive la gratitude pour renforcer ton mindset de trader
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <Calendar className="w-5 h-5 text-[var(--gold-primary)] mx-auto mb-2" />
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{total}</p>
          <p className="text-xs text-[var(--text-secondary)]">Gratitudes ecrites</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Award className="w-5 h-5 text-[var(--gold-primary)] mx-auto mb-2" />
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">+50</p>
          <p className="text-xs text-[var(--text-secondary)]">Points par entree</p>
        </div>
      </div>

      {/* Write form */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <p className="text-sm text-[var(--text-secondary)]">{todayPrompt}</p>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Aujourd'hui, je suis reconnaissant pour..."
          maxLength={500}
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-rose-400/50 focus:outline-none resize-none"
          data-testid="gratitude-input"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">{content.length}/500</span>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            data-testid="submit-gratitude"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Ecrire
          </button>
        </div>
        {pointsEarned && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-emerald-400 font-medium"
          >
            +{pointsEarned} points gagnes !
          </motion.p>
        )}
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Heart className="w-12 h-12 text-[var(--text-secondary)]/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Commence ton journal</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Ecris ta premiere gratitude et gagne 50 points
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card p-4"
            >
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">{entry.content}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
