'use client';

// Page /compte/configuration — onboarding KYC Stripe Connect (V4.1)
// Crée automatiquement le compte si l'user n'en a pas encore.

import { ConnectAccountOnboarding } from '@stripe/react-connect-js';
import ConnectRoot from '@/components/connect/ConnectRoot';

export default function ComptConfigurationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Configuration de ton compte
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Vérifie ton identité pour activer tes retraits et paiements Purama.
          Fournis tes infos à Stripe — Purama ne les stocke jamais.
        </p>
      </header>
      <ConnectRoot allowAutoOnboard>
        <ConnectAccountOnboarding
          onExit={() => {
            window.location.href = '/compte/gestion';
          }}
        />
      </ConnectRoot>
    </div>
  );
}
