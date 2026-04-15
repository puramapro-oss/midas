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

function bool(v: string | undefined): boolean {
  return v === 'true' || v === '1';
}

export function getPhase(): PhaseConfig {
  const phase = (process.env.PURAMA_PHASE === '2' ? 2 : 1) as PuramaPhase;
  const walletMode = (process.env.WALLET_MODE === 'euros' ? 'euros' : 'points') as WalletMode;
  return {
    phase,
    walletMode,
    cardAvailable: bool(process.env.CARD_AVAILABLE),
    ibanAvailable: bool(process.env.IBAN_AVAILABLE),
    withdrawalAvailable: bool(process.env.WITHDRAWAL_AVAILABLE),
    primeCardActive: bool(process.env.PRIME_CARD_ACTIVE),
    treezorActive: bool(process.env.TREEZOR_ACTIVE),
    binanceActive: bool(process.env.BINANCE_ACTIVE),
    tradeRepublicActive: bool(process.env.TRADE_REPUBLIC_ACTIVE),
    inAppPurchase: bool(process.env.IN_APP_PURCHASE),
    primeMode: (process.env.PRIME_MODE === 'phase2' ? 'phase2' : 'phase1'),
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
 * Montant de la tranche de prime pour un palier donné.
 * PRIME_MODE=phase1 → 3 paliers (J+0 25€ | M+1 25€ | M+2 50€)
 * PRIME_MODE=phase2 → 100€ J+0 (après 1K users)
 */
export function getPrimeTranche(palier: 1 | 2 | 3): number {
  if (getPhase().primeMode === 'phase2') {
    return palier === 1 ? 100 : 0;
  }
  return palier === 1 ? 25 : palier === 2 ? 25 : 50;
}
