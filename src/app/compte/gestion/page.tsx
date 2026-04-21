'use client';

// Page /compte/gestion — ConnectAccountManagement (V4.1)
// Permet à l'user de mettre à jour ses infos de compte après onboarding.

import { ConnectAccountManagement } from '@stripe/react-connect-js';
import ConnectRoot from '@/components/connect/ConnectRoot';

export default function CompteGestionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Gestion du compte
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Modifie tes informations bancaires, ton identité ou tes préférences.
        </p>
      </header>
      <ConnectRoot>
        <ConnectAccountManagement />
      </ConnectRoot>
    </div>
  );
}
