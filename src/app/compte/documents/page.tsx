'use client';

// Page /compte/documents — ConnectDocuments (V4.1)
// Relevés, factures, attestations fiscales téléchargeables par l'user.

import { ConnectDocuments } from '@stripe/react-connect-js';
import ConnectRoot from '@/components/connect/ConnectRoot';

export default function CompteDocumentsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Mes documents
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Télécharge tes relevés de paiement, attestations et factures. Pour ta
          déclaration fiscale annuelle, va aussi dans /fiscal.
        </p>
      </header>
      <ConnectRoot>
        <ConnectDocuments />
      </ConnectRoot>
    </div>
  );
}
