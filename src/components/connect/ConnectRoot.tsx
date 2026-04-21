'use client';

// =============================================================================
// MIDAS — ConnectRoot (V4.1)
// Wrapper client unique pour toutes les pages /compte/*. Charge la session
// Stripe Connect, initialise loadConnectAndInitialize, et fournit le contexte
// aux Embedded Components.
//
// Cycle :
//   1. Fetch GET /api/connect/status → détermine l'état du compte
//   2. Si pas onboardé : POST /api/connect/onboard (crée le compte Stripe)
//   3. Fetch client_secret via POST /api/connect/account-session
//   4. loadConnectAndInitialize(publishableKey, fetchClientSecret, appearance)
//   5. Render <ConnectComponentsProvider> avec enfants
//
// Thème : dark MIDAS (gold #FFD700 sur fond #0E1220).
// =============================================================================

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from '@stripe/connect-js';
import { ConnectComponentsProvider } from '@stripe/react-connect-js';
import type { ConnectAccountSummary } from '@/types/database';

interface Props {
  /** L'état initial (optionnel) — si fourni, saute le premier fetch status. */
  initialSummary?: ConnectAccountSummary | null;
  /**
   * Quand true, ConnectRoot créera le compte Connect s'il n'existe pas
   * (appelle /api/connect/onboard). À activer uniquement sur la page
   * /compte/configuration — ailleurs on affiche un empty state.
   */
  allowAutoOnboard?: boolean;
  children: ReactNode;
}

type Phase =
  | { status: 'loading' }
  | { status: 'no_account' }
  | { status: 'error'; message: string }
  | { status: 'ready'; instance: StripeConnectInstance };

const MIDAS_APPEARANCE = {
  variables: {
    fontFamily: '"DM Sans", system-ui, sans-serif',
    colorPrimary: '#FFD700',
    colorBackground: '#0E1220',
    colorText: '#F8FAFC',
    colorDanger: '#EF4444',
    borderRadius: '12px',
    spacingUnit: '8px',
  },
};

export default function ConnectRoot({
  initialSummary = null,
  allowAutoOnboard = false,
  children,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ status: 'loading' });
  const initialised = useRef(false);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const res = await fetch('/api/connect/account-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur session' }));
      throw new Error(err.error ?? 'Impossible de charger la session Connect');
    }
    const body = (await res.json()) as { client_secret: string };
    return body.client_secret;
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    if (!publishableKey) {
      setPhase({
        status: 'error',
        message:
          'Clé publique Stripe manquante. Configure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.',
      });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // 1. Déterminer l'état (skip le fetch si summary fournie par le parent)
        let summary: ConnectAccountSummary | null = initialSummary;
        if (!summary) {
          const statusRes = await fetch('/api/connect/status');
          if (!statusRes.ok) {
            const err = await statusRes.json().catch(() => ({ error: 'Erreur statut' }));
            throw new Error(err.error ?? 'Impossible de lire le statut Connect');
          }
          summary = (await statusRes.json()) as ConnectAccountSummary;
        }

        // 2. Pas de compte ?
        if (!summary.stripe_account_id) {
          if (!allowAutoOnboard) {
            if (!cancelled) setPhase({ status: 'no_account' });
            return;
          }
          const onboardRes = await fetch('/api/connect/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!onboardRes.ok) {
            const err = await onboardRes
              .json()
              .catch(() => ({ error: 'Erreur onboard' }));
            throw new Error(err.error ?? 'Création du compte Stripe impossible');
          }
        }

        // 3. Initialiser Stripe Connect
        const instance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret,
          appearance: MIDAS_APPEARANCE,
          locale: 'fr-FR',
        });

        if (!cancelled) setPhase({ status: 'ready', instance });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erreur inconnue Connect';
        if (!cancelled) setPhase({ status: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allowAutoOnboard, fetchClientSecret, initialSummary, publishableKey]);

  if (phase.status === 'loading') {
    return (
      <div
        data-testid="connect-loading"
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center"
      >
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--gold-primary)] border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Chargement de ton compte Purama…
        </p>
      </div>
    );
  }

  if (phase.status === 'no_account') {
    return (
      <div
        data-testid="connect-no-account"
        className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center"
      >
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Active d&apos;abord ton compte Purama
        </h2>
        <p className="mt-3 max-w-md mx-auto text-sm text-[var(--text-secondary)]">
          Cette page nécessite un compte Stripe Connect vérifié. Configure-le en
          quelques minutes pour débloquer tes retraits, paiements et documents.
        </p>
        <Link
          href="/compte/configuration"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[var(--gold-primary)] px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] transition hover:brightness-110"
        >
          Configurer mon compte
        </Link>
      </div>
    );
  }

  if (phase.status === 'error') {
    return (
      <div
        data-testid="connect-error"
        className="rounded-xl border border-[var(--danger)]/40 bg-[var(--bg-card)] p-8"
      >
        <h2 className="text-lg font-semibold text-[var(--danger)]">
          Une erreur est survenue
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{phase.message}</p>
        <p className="mt-4 text-xs text-[var(--text-tertiary)]">
          Réessaie dans un instant. Si le problème persiste, contacte-nous via
          /contact.
        </p>
      </div>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={phase.instance}>
      {children}
    </ConnectComponentsProvider>
  );
}
