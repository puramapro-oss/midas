// =============================================================================
// MIDAS — V6 Phase Helper
// Centralise la lecture de PURAMA_PHASE et des flags d'activation partenaires.
// Lire AVANT tout composant paiement/carte/retrait/prime carte.
// =============================================================================

export type PuramaPhase = 1 | 2;
export type WalletMode = 'points' | 'euros';

export interface PhaseConfig {
  phase: PuramaPhase;
  walletMode: WalletMode;
  cardAvailable: boolean;
  ibanAvailable: boolean;
  withdrawalAvailable: boolean;
  primeCardActive: boolean;
  treezorActive: boolean;
  binanceActive: boolean;
  tradeRepublicActive: boolean;
  inAppPurchase: boolean;
  primeMode: 'phase1' | 'phase2';
}

export function getPhase(): PhaseConfig {
  return {
    // Décision Tissma D1=C (2026-09-05) : aucune variable d'environnement ne
    // peut activer du cash tant que le montage Swan écrit n'est pas validé.
    phase: 1,
    walletMode: 'points',
    cardAvailable: false,
    ibanAvailable: false,
    withdrawalAvailable: false,
    primeCardActive: false,
    treezorActive: false,
    binanceActive: false,
    tradeRepublicActive: false,
    inAppPurchase: false,
    primeMode: 'phase1',
  };
}

export function isCardAvailable(): boolean {
  return getPhase().cardAvailable;
}

export function isWithdrawalAvailable(): boolean {
  return getPhase().withdrawalAvailable;
}

/**
 * Retrait wallet conditionné : subscription_started_at + 30 jours <= now()
 * Art. L221-28 3° Code conso — prime versée wallet uniquement, bloquée 30j.
 */
export function isWithdrawalUnlocked(subscriptionStartedAt: Date | string | null): boolean {
  if (!subscriptionStartedAt) return false;
  const start = typeof subscriptionStartedAt === 'string'
    ? new Date(subscriptionStartedAt)
    : subscriptionStartedAt;
  const unlockAt = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return Date.now() >= unlockAt.getTime();
}

/**
 * Jours restants avant déblocage retrait (0 si déjà débloqué).
 */
export function daysUntilWithdrawal(subscriptionStartedAt: Date | string | null): number {
  if (!subscriptionStartedAt) return 30;
  const start = typeof subscriptionStartedAt === 'string'
    ? new Date(subscriptionStartedAt)
    : subscriptionStartedAt;
  const unlockAt = start.getTime() + 30 * 24 * 60 * 60 * 1000;
  const remainingMs = unlockAt - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

/**
 * Aucun montant cash n'est calculé tant que D1=C reste active.
 * La future valeur en points devra venir du core/config après validation écrite.
 */
export function getPrimeTranche(_palier: 1 | 2 | 3): number {
  return 0;
}
