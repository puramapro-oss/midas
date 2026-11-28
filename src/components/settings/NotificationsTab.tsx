'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { useNotificationSession } from '@/hooks/useNotificationSession';
import styles from './notifications-tab.module.css';

const preferenceKeys = ['email_enabled', 'push_enabled', 'trading_signals', 'community_updates', 'marketing'] as const;
type PreferenceKey = typeof preferenceKeys[number];
type Preferences = Record<PreferenceKey, boolean>;

function parsePreferences(value: unknown): { preferences: Preferences; persisted: boolean } {
  const result = value as { preferences?: Partial<Preferences>; persisted?: boolean } | null;
  if (!result || typeof result.persisted !== 'boolean' || !result.preferences
    || !preferenceKeys.every((key) => typeof result.preferences?.[key] === 'boolean')) {
    throw new Error('Invalid preferences response');
  }
  return {
    preferences: Object.fromEntries(preferenceKeys.map((key) => [key, result.preferences![key]])) as Preferences,
    persisted: result.persisted,
  };
}

export default function NotificationsTab() {
  const session = useNotificationSession();
  if (session === undefined) return <p role="status">Vérification de la session…</p>;
  if (session === null) return <p role="alert">Connectez-vous pour consulter vos préférences de notification.</p>;
  return <AccountNotificationPreferences key={`${session.accountId}:${session.generation}`} accountId={session.accountId} />;
}

function AccountNotificationPreferences({ accountId }: { accountId: string }) {
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [saved, setSaved] = useState<Preferences | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unconfirmedKeys, setUnconfirmedKeys] = useState<PreferenceKey[]>([]);
  const mounted = useRef(false);
  const requestVersion = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const savePending = useRef(false);

  const load = useCallback(async () => {
    if (!mounted.current || savePending.current) return;
    const version = ++requestVersion.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/notifications/preferences', {
        cache: 'no-store', signal: controller.signal,
        headers: { 'x-midas-account-id': accountId },
      });
      if (!response.ok) throw new Error('Preferences unavailable');
      const result = parsePreferences(await response.json());
      if (!mounted.current || version !== requestVersion.current) return;
      setDraft(result.preferences);
      setSaved(result.preferences);
      setPersisted(result.persisted);
      setUnconfirmedKeys([]);
    } catch {
      if (mounted.current && version === requestVersion.current && !controller.signal.aborted) {
        setError('Impossible de charger vos préférences. Aucun réglage n’a été modifié.');
      }
    } finally {
      if (mounted.current && version === requestVersion.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
      activeRequest.current?.abort();
    };
  }, [load]);

  const changedKeys = draft && saved ? preferenceKeys.filter((key) => draft[key] !== saved[key]) : [];
  const canSave = Boolean(draft && (!persisted || changedKeys.length > 0 || unconfirmedKeys.length > 0));

  const save = async () => {
    if (!draft || !canSave || savePending.current || !mounted.current) return;
    savePending.current = true;
    const version = ++requestVersion.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const keys = persisted ? [...new Set([...changedKeys, ...unconfirmedKeys])] : preferenceKeys;
    const patch = Object.fromEntries(keys.map((key) => [key, draft[key]]));
    setSaving(true);
    setError(null);
    setMessage(null);
    let sessionChanged = false;
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH', signal: controller.signal,
        headers: { 'content-type': 'application/json', 'x-midas-account-id': accountId },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        if ((response.status === 401 || response.status === 409) && mounted.current && version === requestVersion.current) {
          sessionChanged = true;
          setDraft(null);
          setSaved(null);
        }
        throw new Error('Preferences not saved');
      }
      const result = parsePreferences(await response.json());
      if (!result.persisted) throw new Error('Preferences not confirmed');
      if (!mounted.current || version !== requestVersion.current) return;
      setDraft(result.preferences);
      setSaved(result.preferences);
      setPersisted(true);
      setUnconfirmedKeys([]);
      setMessage('Préférences enregistrées.');
    } catch {
      if (mounted.current && version === requestVersion.current && !controller.signal.aborted) {
        if (sessionChanged) {
          setError('Votre session a changé. Rechargez les préférences du compte connecté.');
        } else {
          // The database may have committed before the response was lost.
          setUnconfirmedKeys((previous) => [...new Set([...previous, ...keys])]);
          setError('La sauvegarde n’a pas pu être confirmée. Vos choix restent affichés pour réessayer.');
        }
      }
    } finally {
      savePending.current = false;
      if (mounted.current && version === requestVersion.current) setSaving(false);
    }
  };

  const change = (key: PreferenceKey, value: boolean) => {
    if (savePending.current) return;
    setDraft((previous) => previous ? { ...previous, [key]: value } : null);
    setMessage(null);
  };

  const toggle = (key: PreferenceKey, label: string, description: string) => (
    <Toggle checked={draft?.[key] ?? false} onChange={(value) => change(key, value)}
      label={label} description={description} disabled={saving}
      className={styles.preferenceToggle} />
  );

  return (
    <div className="space-y-6 text-[var(--text-primary)]" data-testid="settings-notifications">
      <div>
        <h3 className="font-semibold">Vos notifications</h3>
        <p className="text-sm mt-2">
          Ces préférences sont propres à votre compte. Les alertes de trading ne sont pas encore actives.
          Les activer ici ne donne aucune autorisation de passer ou de fermer un ordre.
        </p>
      </div>
      {loading && <p role="status">Chargement des préférences…</p>}
      {error && <div role="alert" className="rounded-lg border border-[var(--border-default)] p-3 text-sm">
        <p>{error}</p>
        {!draft && <button type="button" disabled={loading} onClick={() => { void load(); }}
          className="mt-2 underline disabled:opacity-50">Réessayer le chargement</button>}
      </div>}
      {draft && !loading && <>
        {!persisted && <p className="text-sm" data-testid="notification-preferences-defaults">
          Réglages par défaut. Ils seront enregistrés lorsque vous les sauvegarderez.
        </p>}
        <fieldset disabled={saving} className="space-y-4">
          <legend className="text-sm font-semibold mb-4">Canaux souhaités</legend>
          {toggle('email_enabled', 'Email', 'Autoriser les notifications par email lorsque l’envoi est disponible.')}
          {toggle('push_enabled', 'Push', 'Autoriser les notifications push lorsque votre appareil est inscrit au service.')}
        </fieldset>
        <fieldset disabled={saving} className="space-y-4 border-t border-[var(--border-default)] pt-4">
          <legend className="text-sm font-semibold mb-4">Types de notification</legend>
          {toggle('trading_signals', 'Alertes de trading', 'Préférence pour les futurs signaux. Service actuellement indisponible.')}
          {toggle('community_updates', 'Communauté', 'Actualités de votre communauté MIDAS.')}
          {toggle('marketing', 'Offres et nouveautés', 'Recevoir les communications commerciales facultatives.')}
        </fieldset>
        <p className="text-sm">
          Les SMS, les alertes d’exécution, le récapitulatif P&amp;L et les actualités de marché
          n’ont pas encore de réglage individuel enregistré.
        </p>
        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border-default)] pt-4">
          <button type="button" onClick={() => { void save(); }} disabled={saving || !canSave}
            data-testid="notification-preferences-save"
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Enregistrer les préférences'}
          </button>
          {message && <p role="status" className="text-sm">{message}</p>}
          {!message && persisted && changedKeys.length === 0 && unconfirmedKeys.length === 0 && <p className="text-sm">Préférences enregistrées pour ce compte.</p>}
        </div>
      </>}
    </div>
  );
}
