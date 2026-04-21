/**
 * MIDAS — Karma Split engine V4.1 Axe 2 (pure function)
 *
 * Répartit un paiement abonnement Stripe en 4 pools :
 *   reward 50% · adya 10% · asso 10% · sasu 30%
 *
 * Contrat :
 *   - Entrée  : amount en CENTIMES d'euros (entier, >= 0).
 *   - Sortie  : montants EN EUROS (decimal 2), somme = amount_eur exact.
 *   - Aucune dépendance DB, aucune I/O : fonction pure testable unitairement.
 *
 * Gestion d'arrondi :
 *   On calcule reward/adya/asso en cents arrondis au plus proche, puis sasu
 *   absorbe le reste (amount - reward - adya - asso). Ce choix garantit
 *   `sum == gross` au cent près sans jamais "perdre" d'argent user ou Asso
 *   (seule la marge SASU peut varier de ±1 cent à chaque split).
 *
 * Voir STRIPE_CONNECT_KARMA_V4.md §Flux économique global.
 */

import { KARMA_SPLIT_RATES, type KarmaSplitBreakdown } from '@/types/karma';

/** Convertit cents → EUR avec 2 décimales (arrondi fin). */
function centsToEur(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Calcule le split 50/10/10/30 d'un montant (en cents) sur les 4 pools.
 * sasu absorbe le reliquat d'arrondi pour préserver l'invariant somme=gross.
 *
 * @param amountCents - montant brut en cents (entier, >= 0)
 * @throws si amountCents < 0 ou non fini
 */
export function computeKarmaSplit(amountCents: number): KarmaSplitBreakdown {
  if (!Number.isFinite(amountCents)) {
    throw new Error(`computeKarmaSplit: amountCents must be finite, got ${amountCents}`);
  }
  if (amountCents < 0) {
    throw new Error(`computeKarmaSplit: amountCents must be >= 0, got ${amountCents}`);
  }

  // Canonicalise en entier (Stripe renvoie déjà un entier, mais double-ceinture)
  const gross = Math.round(amountCents);

  // Rounding stratégique : les 3 premiers pools arrondis au plus proche,
  // SASU absorbe le reliquat. Invariant : somme = gross.
  const rewardCents = Math.round(gross * KARMA_SPLIT_RATES.reward);
  const adyaCents = Math.round(gross * KARMA_SPLIT_RATES.adya);
  const assoCents = Math.round(gross * KARMA_SPLIT_RATES.asso);
  const sasuCents = gross - rewardCents - adyaCents - assoCents;

  return {
    reward_eur: centsToEur(rewardCents),
    adya_eur: centsToEur(adyaCents),
    asso_eur: centsToEur(assoCents),
    sasu_eur: centsToEur(sasuCents),
    total_eur: centsToEur(gross),
  };
}
