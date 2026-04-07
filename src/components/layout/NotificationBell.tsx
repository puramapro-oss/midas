'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const json = await res.json();
      setNotifs(json.notifications ?? []);
      setUnread(json.unread ?? 0);
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } finally {
      setLoading(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(id);
  }, []);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="notification-bell"
        aria-label="Notifications"
        className="relative p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] hover:border-[var(--gold-primary)]/30 transition"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            data-testid="notification-panel"
            className="absolute right-0 mt-2 w-80 md:w-96 max-h-[70vh] overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-primary)] backdrop-blur-xl shadow-2xl z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Bell className="size-4" />
                Notifications
                {unread > 0 && (
                  <span className="text-xs font-normal text-amber-400">({unread} non lues)</span>
                )}
              </h3>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  data-testid="notification-mark-all"
                  className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3" />}
                  Tout marquer lu
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
              {notifs.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm" data-testid="notification-empty">
                  <Bell className="size-8 mx-auto mb-2 opacity-30" />
                  Aucune notification
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 hover:bg-white/[0.02] transition ${
                        !n.read ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {!n.read && (
                              <span className="size-2 rounded-full bg-amber-400 flex-shrink-0" />
                            )}
                            <p className="font-medium text-white text-sm truncate">{n.title}</p>
                          </div>
                          {n.body && (
                            <p className="text-white/60 text-xs mt-1 line-clamp-2">{n.body}</p>
                          )}
                          <p className="text-white/40 text-[10px] mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.read && (
                          <button
                            onClick={() => markOneRead(n.id)}
                            className="p-1 rounded hover:bg-white/10 text-white/60"
                            aria-label="Marquer lu"
                          >
                            <Check className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
