'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationSession } from '@/hooks/useNotificationSession';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}
interface NotificationSnapshot { notifications: Notification[]; unread: number; }

function readSnapshot(value: unknown): NotificationSnapshot {
  const data = value as Partial<NotificationSnapshot> | null;
  if (!data || !Number.isSafeInteger(data.unread) || (data.unread ?? -1) < 0
    || !Array.isArray(data.notifications)
    || !data.notifications.every((n) => n && typeof n.id === 'string'
      && typeof n.title === 'string' && typeof n.read === 'boolean'
      && (n.body === null || typeof n.body === 'string')
      && typeof n.created_at === 'string' && Number.isFinite(Date.parse(n.created_at)))) {
    throw new Error('Invalid notification response');
  }
  return data as NotificationSnapshot;
}

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `il y a ${hours} h` : `il y a ${Math.floor(hours / 24)} j`;
}

export default function NotificationBell() {
  const session = useNotificationSession();
  if (!session) {
    return (
      <button type="button" disabled data-testid="notification-bell" aria-label="Notifications"
        title={session === undefined ? 'Chargement de la session' : 'Connexion nécessaire'}
        className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)]">
        <Bell className="w-4 h-4" />
      </button>
    );
  }
  return <AccountNotificationBell key={`${session.accountId}:${session.generation}`} accountId={session.accountId} />;
}

function AccountNotificationBell({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<NotificationSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const mutationPending = useRef(false);
  const requestVersion = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const panelId = useId();

  const fetchNotifs = useCallback(async (afterAcknowledgement = false) => {
    if (!mounted.current || (mutationPending.current && !afterAcknowledgement)) return false;
    const version = ++requestVersion.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setRefreshing(true);
    try {
      const res = await fetch('/api/notifications', {
        cache: 'no-store', signal: controller.signal,
        headers: { 'x-midas-account-id': accountId },
      });
      if (!res.ok) {
        if ((res.status === 401 || res.status === 409) && mounted.current && version === requestVersion.current) {
          setSnapshot(null);
        }
        throw new Error('Notifications unavailable');
      }
      const next = readSnapshot(await res.json());
      if (!mounted.current || version !== requestVersion.current) return false;
      setSnapshot(next);
      setError(null);
      return true;
    } catch {
      if (mounted.current && version === requestVersion.current && !controller.signal.aborted) {
        setError('Impossible de charger les notifications. Réessayez.');
      }
      return false;
    } finally {
      if (mounted.current && version === requestVersion.current) setRefreshing(false);
    }
  }, [accountId]);

  const markRead = async (body: { all: true } | { ids: string[] }) => {
    if (mutationPending.current || !mounted.current) return;
    mutationPending.current = true;
    setSaving(true);
    setError(null);
    const version = ++requestVersion.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH', signal: controller.signal,
        headers: { 'content-type': 'application/json', 'x-midas-account-id': accountId },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if ((res.status === 401 || res.status === 409) && mounted.current && version === requestVersion.current) {
          setSnapshot(null);
        }
        throw new Error('Acknowledgement failed');
      }
      const result = await res.json();
      if (result?.ok !== true) throw new Error('Acknowledgement unconfirmed');
      if (!mounted.current || version !== requestVersion.current) return;
      // Re-read the authoritative total, including alerts arriving during acknowledgement.
      const refreshed = await fetchNotifs(true);
      if (!refreshed && mounted.current) {
        setError('Lecture enregistrée. Impossible d’actualiser la liste pour le moment.');
      }
    } catch {
      if (mounted.current && version === requestVersion.current && !controller.signal.aborted) {
        setError('La lecture n’a pas pu être confirmée. Réessayez.');
      }
    } finally {
      mutationPending.current = false;
      if (mounted.current) {
        setSaving(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    mounted.current = true;
    void fetchNotifs();
    const interval = setInterval(() => { void fetchNotifs(); }, 30_000);
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
      activeRequest.current?.abort();
      clearInterval(interval);
    };
  }, [fetchNotifs]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>('[data-testid="notification-bell"]')?.focus();
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const unread = snapshot?.unread ?? 0;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((value) => !value)}
        data-testid="notification-bell" aria-label={unread > 0 ? `Notifications, ${unread} non lues` : 'Notifications'} aria-expanded={open} aria-controls={panelId}
        className="relative p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] transition">
        <Bell className="w-4 h-4" />
        {unread > 0 && <span data-testid="notification-badge" aria-label={`${unread} notifications non lues`}
          className="absolute -top-1 -right-1 size-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id={panelId} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }} data-testid="notification-panel" role="region" aria-label="Centre de notifications"
            className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-2xl z-50">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-[var(--text-primary)]">Notifications {unread > 0 && <span className="text-xs font-normal">({unread} non lues)</span>}</h3>
              {unread > 0 && <button type="button" onClick={() => { void markRead({ all: true }); }} disabled={saving}
                data-testid="notification-mark-all" className="flex items-center gap-1 text-xs text-[var(--text-primary)] disabled:opacity-50">
                {saving ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3" />} Tout marquer lu
              </button>}
            </div>
            {error && <div className="p-4 text-sm text-[var(--text-primary)]" role="alert">
              <p>{error}</p>
              <button type="button" disabled={refreshing || saving} onClick={() => { void fetchNotifs(); }} className="underline mt-2 disabled:opacity-50">Réessayer</button>
            </div>}
            {refreshing && !snapshot && !error && <p role="status" className="p-6 text-sm text-[var(--text-primary)]">Chargement des notifications…</p>}
            {snapshot?.notifications.length === 0 && !error && <div className="p-8 text-center text-[var(--text-primary)] text-sm" data-testid="notification-empty">
              <Bell className="size-8 mx-auto mb-2 opacity-50" /> Aucune notification
            </div>}
            {snapshot?.notifications.map((notification) => <div key={notification.id} data-testid="notification-item"
              className={`p-4 border-b border-[var(--border-subtle)] ${notification.read ? '' : 'bg-blue-500/5'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 text-[var(--text-primary)]">
                  <p className="font-medium text-sm break-words">{notification.title}</p>
                  {notification.body && <p className="text-xs mt-1 break-words">{notification.body}</p>}
                  <p className="text-xs mt-1">{timeAgo(notification.created_at)}</p>
                </div>
                {!notification.read && <button type="button" disabled={saving}
                  onClick={() => { void markRead({ ids: [notification.id] }); }}
                  className="p-2 rounded text-[var(--text-primary)] disabled:opacity-50" aria-label={`Marquer lu : ${notification.title}`}>
                  <Check className="size-4" />
                </button>}
              </div>
            </div>)}
            <p className="p-4 text-xs text-[var(--text-primary)] border-t border-[var(--border-default)]">
              Marquer une alerte comme lue n’ouvre, ne modifie et ne ferme aucun ordre.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
