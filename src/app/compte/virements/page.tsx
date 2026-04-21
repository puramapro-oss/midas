'use client';

// Page /compte/virements — ConnectPayouts (V4.1)
// Historique des virements SEPA reçus par l'user sur son IBAN.

import { ConnectPayouts } from '@stripe/react-connect-js';
import ConnectRoot from '@/components/connect/ConnectRoot';

export default function CompteVirementsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Mes virements
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Tes retraits sont versés automatiquement sur ton IBAN. Délai SEPA
          standard : 1 à 3 jours ouvrés.
        </p>
      </header>
      <ConnectRoot>
        <ConnectPayouts />
      </ConnectRoot>
    </div>
  );
}
