// =============================================================================
// MIDAS — /confirmation (V6 §11 — post-paiement Stripe)
// Deep link purama://activate + confettis + prime J+0 affichée
// =============================================================================

import type { Metadata } from 'next';
import ConfirmationClient from './ConfirmationClient';

export const metadata: Metadata = {
  title: 'Bienvenue dans MIDAS',
  description: 'Ton abonnement est actif. Ta prime de bienvenue est créditée.',
};

export default function ConfirmationPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const plan = typeof searchParams?.plan === 'string' ? searchParams.plan : 'pro';
  return <ConfirmationClient plan={plan} />;
}
