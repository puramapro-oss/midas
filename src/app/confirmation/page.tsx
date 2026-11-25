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

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { plan } = await searchParams;
  return <ConfirmationClient plan={typeof plan === 'string' ? plan : 'pro'} />;
}
