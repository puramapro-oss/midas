'use client';

// Page /compte/notifications — ConnectNotificationBanner (V4.1)
// Bannière d'actions requises (KYC expiré, doc manquant, etc.).

import { ConnectNotificationBanner } from '@stripe/react-connect-js';
import ConnectRoot from '@/components/connect/ConnectRoot';

export default function CompteNotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Mes notifications
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Actions requises sur ton compte Purama : documents à renvoyer,
          justificatifs, KYC à renouveler.
        </p>
      </header>
      <ConnectRoot>
        <ConnectNotificationBanner />
      </ConnectRoot>
    </div>
  );
}
