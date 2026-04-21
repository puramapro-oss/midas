'use client';

// Page /compte/paiements — ConnectPayments (V4.1)
// Historique des paiements reçus via Purama (primes, gains, commissions).

import { ConnectPayments } from '@stripe/react-connect-js';
import ConnectRoot from '@/components/connect/ConnectRoot';

export default function ComptePaiementsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Mes paiements
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Chaque entrée d&apos;argent sur ton compte Purama (primes, missions,
          commissions de parrainage, gains).
        </p>
      </header>
      <ConnectRoot>
        <ConnectPayments />
      </ConnectRoot>
    </div>
  );
}
