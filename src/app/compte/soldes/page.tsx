'use client';

// Page /compte/soldes — ConnectBalances (V4.1)
// Solde disponible / en attente / en transit.

import { ConnectBalances } from '@stripe/react-connect-js';
import ConnectRoot from '@/components/connect/ConnectRoot';

export default function CompteSoldesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Mes soldes
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Détail de ton solde disponible, en attente de validation, et en
          transit vers ton IBAN.
        </p>
      </header>
      <ConnectRoot>
        <ConnectBalances />
      </ConnectRoot>
    </div>
  );
}
