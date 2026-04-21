'use client';

// =============================================================================
// MIDAS — Hub /compte/connect (V4.1 Axe 3)
//
// Page unique d'entrée pour tout ce qui concerne le compte Stripe Connect de
// l'user :
//   - Lit le statut via /api/connect/status
//   - Si not_started / in_progress / requirements_due → embarque
//     ConnectAccountOnboarding (Embedded) avec allowAutoOnboard
//   - Si verified → affiche résumé (badges KYC + retraits activés) + liens
//     rapides vers les 7 sub-pages + section WithdrawButton (injectée par F5
//     via slot inferieur — pour l'instant, lien vers /compte/virements)
//
// Page 100% client (ConnectAccountOnboarding = composant client Stripe).
// Protégée par middleware (compte/* est auth-gated).
// =============================================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConnectAccountOnboarding } from '@stripe/react-connect-js';
import ConnectRoot from '@/components/connect/ConnectRoot';
import type { ConnectAccountSummary, ConnectOnboardingStage } from '@/types/database';
import WithdrawButton from '@/components/connect/WithdrawButton';

const STAGE_LABELS: Record<ConnectOnboardingStage, { label: string; tone: 'neutral' | 'warn' | 'ok' }> = {
  not_started: { label: 'Non démarré', tone: 'neutral' },
  in_progress: { label: 'En cours', tone: 'warn' },
  requirements_due: { label: 'Action requise', tone: 'warn' },
  verified: { label: 'Vérifié', tone: 'ok' },
};

const QUICK_LINKS: Array<{ href: string; title: string; description: string }> = [
  {
    href: '/compte/paiements',
    title: 'Paiements',
    description: 'Historique des transferts reçus.',
  },
  {
    href: '/compte/virements',
    title: 'Virements',
    description: 'Planifier ou consulter tes retraits.',
  },
  {
    href: '/compte/soldes',
    title: 'Soldes',
    description: 'Montant disponible + en attente.',
  },
  {
    href: '/compte/documents',
    title: 'Documents',
    description: 'Relevés, attestations fiscales.',
  },
  {
    href: '/compte/gestion',
    title: 'Gestion',
    description: 'Mettre à jour identité & IBAN.',
  },
  {
    href: '/compte/notifications',
    title: 'Notifications',
    description: 'Alertes Stripe (KYC, documents).',
  },
  {
    href: '/compte/configuration',
    title: 'Onboarding détaillé',
    description: 'Accès direct à la configuration Stripe.',
  },
];

export default function CompteConnectHubPage() {
  const [summary, setSummary] = useState<ConnectAccountSummary | null>(null);
  const [balanceEur, setBalanceEur] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [statusRes, balanceRes] = await Promise.all([
          fetch('/api/connect/status'),
          fetch('/api/wallet/balance'),
        ]);

        if (!statusRes.ok) {
          throw new Error('Impossible de charger ton statut Stripe');
        }

        const statusData = (await statusRes.json()) as ConnectAccountSummary;
        if (cancelled) return;
        setSummary(statusData);

        if (balanceRes.ok) {
          const balanceData = (await balanceRes.json()) as { balance_eur?: number };
          if (!cancelled) {
            setBalanceEur(
              typeof balanceData.balance_eur === 'number' ? balanceData.balance_eur : 0,
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erreur inconnue');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stage = summary?.stage ?? 'not_started';
  const stageMeta = STAGE_LABELS[stage];
  const isVerified = stage === 'verified' && summary?.payouts_enabled === true;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Ton compte Purama
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Tout ce qui concerne tes paiements, retraits et documents. Stripe
          gère la conformité bancaire — Purama ne stocke jamais tes infos
          sensibles.
        </p>
      </header>

      {/* --- STATUS CARD --- */}
      <section
        data-testid="connect-status-card"
        className="mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
            Statut du compte
          </span>
          {loading ? (
            <span
              data-testid="connect-status-loading"
              className="inline-block h-5 w-24 animate-pulse rounded bg-white/10"
            />
          ) : (
            <span
              data-testid="connect-status-badge"
              data-stage={stage}
              className={
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ' +
                (stageMeta.tone === 'ok'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : stageMeta.tone === 'warn'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-white/10 text-[var(--text-secondary)]')
              }
            >
              {stageMeta.label}
            </span>
          )}
        </div>

        {error ? (
          <p className="mt-3 text-sm text-[var(--danger)]" data-testid="connect-status-error">
            {error}
          </p>
        ) : null}

        {summary && !loading ? (
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[var(--text-tertiary)]">KYC soumis</dt>
              <dd className="mt-1 font-medium text-[var(--text-primary)]">
                {summary.details_submitted ? 'Oui' : 'Non'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Retraits activés</dt>
              <dd
                data-testid="connect-payouts-enabled"
                className="mt-1 font-medium text-[var(--text-primary)]"
              >
                {summary.payouts_enabled ? 'Oui' : 'Non'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Paiements activés</dt>
              <dd className="mt-1 font-medium text-[var(--text-primary)]">
                {summary.charges_enabled ? 'Oui' : 'Non'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Solde wallet</dt>
              <dd
                data-testid="connect-wallet-balance"
                className="mt-1 font-medium text-[var(--text-primary)]"
              >
                {balanceEur !== null
                  ? balanceEur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                  : '—'}
              </dd>
            </div>
          </dl>
        ) : null}

        {summary?.disabled_reason ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            Stripe indique : <code>{summary.disabled_reason}</code>. Suis les
            étapes ci-dessous pour résoudre.
          </p>
        ) : null}
      </section>

      {/* --- ONBOARDING SECTION (si stage != verified) --- */}
      {!loading && !isVerified ? (
        <section
          data-testid="connect-onboarding-section"
          className="mb-8"
        >
          <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
            Termine ton onboarding
          </h2>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Stripe a besoin de quelques infos pour activer tes retraits. Cette
            vérification est réutilisée pour toutes les apps Purama — tu ne la
            referas jamais.
          </p>
          <ConnectRoot allowAutoOnboard>
            <ConnectAccountOnboarding
              onExit={() => {
                // Recharge le statut pour mettre à jour le badge
                window.location.reload();
              }}
            />
          </ConnectRoot>
        </section>
      ) : null}

      {/* --- WITHDRAW SECTION (si verified) --- */}
      {!loading && isVerified ? (
        <section
          data-testid="connect-withdraw-section"
          className="mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Retirer mes gains
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Transfert instantané vers ton compte Stripe. Seuil minimum : 20€.
            Retire à partir de 50€ pour payer moins de frais Stripe (2,38€
            contre 2,30€ à 20€).
          </p>
          <div className="mt-4">
            <WithdrawButton
              balanceEur={balanceEur ?? 0}
              onSuccess={(newBalance) => setBalanceEur(newBalance)}
            />
          </div>
        </section>
      ) : null}

      {/* --- QUICK LINKS --- */}
      <section data-testid="connect-quicklinks" className="mb-4">
        <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
          Navigation rapide
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition hover:border-[var(--gold-primary)]/40 hover:bg-[var(--bg-card-hover)]"
              >
                <div className="font-medium text-[var(--text-primary)]">
                  {link.title}
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {link.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
