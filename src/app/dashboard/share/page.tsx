'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Share2,
  Copy,
  Check,
  Zap,
  Gift,
  Loader2,
  ExternalLink,
  MessageCircle,
  Send,
  AtSign,
  Link2,
  Mail,
} from 'lucide-react';

interface ShareStats {
  total_shares: number;
  today_shares: number;
  max_daily: number;
  can_share: boolean;
  referral_code: string;
  share_link: string;
  streak_multiplier: number;
  points_per_share: number;
}

const PLATFORMS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500/20 text-green-400', getUrl: (link: string) => `https://wa.me/?text=${encodeURIComponent(`Rejoins MIDAS, la plateforme de trading IA ! ${link}`)}` },
  { key: 'telegram', label: 'Telegram', icon: Send, color: 'bg-blue-500/20 text-blue-400', getUrl: (link: string) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Rejoins MIDAS !')}` },
  { key: 'twitter', label: 'Twitter/X', icon: AtSign, color: 'bg-sky-500/20 text-sky-400', getUrl: (link: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Je trade avec MIDAS, l'IA qui change tout ! Rejoins-moi : ${link}`)}` },
  { key: 'linkedin', label: 'LinkedIn', icon: Link2, color: 'bg-blue-600/20 text-blue-400', getUrl: (link: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
  { key: 'email', label: 'Email', icon: Mail, color: 'bg-purple-500/20 text-purple-400', getUrl: (link: string) => `mailto:?subject=${encodeURIComponent('MIDAS — Trading IA')}&body=${encodeURIComponent(`Rejoins MIDAS : ${link}`)}` },
];

export default function SharePage() {
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/share');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCopy = async () => {
    if (!stats) return;
    await navigator.clipboard.writeText(stats.share_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (platform: string, url: string) => {
    if (!stats?.can_share) return;
    setSharing(platform);
    try {
      await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      window.open(url, '_blank', 'noopener');
      fetchStats();
    } catch {
      /* silent */
    } finally {
      setSharing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold-primary)]" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Share2 className="w-7 h-7 text-[var(--gold-primary)]" />
          Partager MIDAS
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Gagne des points en partageant ton lien de parrainage
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Partages total', value: stats.total_shares, icon: Share2 },
          { label: "Aujourd'hui", value: `${stats.today_shares}/${stats.max_daily}`, icon: Gift },
          { label: 'Multiplicateur', value: `x${stats.streak_multiplier}`, icon: Zap },
          { label: 'Points/partage', value: stats.points_per_share, icon: Gift },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 text-center"
          >
            <s.icon className="w-5 h-5 text-[var(--gold-primary)] mx-auto mb-2" />
            <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{s.value}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Share link */}
      <div className="glass-card p-5">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Ton lien de parrainage</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-mono text-[var(--text-secondary)] truncate">
            {stats.share_link}
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-primary)] transition-colors flex items-center gap-2 text-sm"
            data-testid="copy-share-link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copie !' : 'Copier'}
          </button>
        </div>
      </div>

      {/* Platform buttons */}
      <div className="glass-card p-5">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
          Partager sur {!stats.can_share && <span className="text-amber-400 ml-2">(limite atteinte)</span>}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => handleShare(p.key, p.getUrl(stats.share_link))}
              disabled={!stats.can_share || sharing === p.key}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] transition-all hover:scale-[1.02] disabled:opacity-40 ${p.color}`}
              data-testid={`share-${p.key}`}
            >
              {sharing === p.key ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <p.icon className="w-6 h-6" />
              )}
              <span className="text-xs font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Native share */}
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={() => {
            navigator.share({
              title: 'MIDAS — Trading IA',
              text: 'Rejoins MIDAS !',
              url: stats.share_link,
            });
          }}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-amber-600 text-black font-semibold text-sm hover:opacity-90 transition-opacity"
          data-testid="native-share-btn"
        >
          <ExternalLink className="w-4 h-4" />
          Partager via ton appareil
        </button>
      )}

      {/* Streak multiplier info */}
      {stats.streak_multiplier > 1 && (
        <div className="glass-card p-4 border-[var(--gold-primary)]/20">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[var(--gold-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--gold-primary)]">Multiplicateur streak x{stats.streak_multiplier} actif !</p>
              <p className="text-xs text-[var(--text-secondary)]">Tes partages rapportent {stats.points_per_share} points au lieu de 300</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
