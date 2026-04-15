// =============================================================================
// MIDAS — /subscribe (V6 §11 — Paiement)
// Bouton EXACT "Démarrer & recevoir ma prime" + mention L221-28 sous bouton.
// ZÉRO checkbox rétractation (waiver implicite par le clic).
// =============================================================================

import type { Metadata } from 'next';
import SubscribeClient from './SubscribeClient';

export const metadata: Metadata = {
  title: 'Démarrer — MIDAS',
  description: 'Active ton abonnement MIDAS et reçois ta prime de bienvenue.',
};

export default function SubscribePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const plan = (typeof searchParams?.plan === 'string' ? searchParams.plan : 'pro') as 'pro' | 'ultra';
  const period = (typeof searchParams?.period === 'string' ? searchParams.period : 'monthly') as
    | 'monthly'
    | 'yearly';

  return <SubscribeClient plan={plan} period={period} />;
}
