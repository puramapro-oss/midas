// =============================================================================
// WEALTH ENGINE V2 — Purity Engine (Purama Card cashback levels)
// =============================================================================

import { PURITY_TIERS, type PurityLevel, type PurityTier } from './types';

// MCC (Merchant Category Code) mapping to purity levels
const MCC_MAP: Record<string, PurityLevel> = {
  // Diamant — 20%
  '5411': 'diamant', // Grocery (bio/local)
  '5422': 'diamant', // Freezer/meat (bio)
  '5431': 'diamant', // Bakeries (artisan)
  '5992': 'diamant', // Florists/nurseries
  '5261': 'diamant', // Nurseries/garden

  // Or — 15%
  '5451': 'or', // Dairy (bio)
  '5947': 'or', // Gift/card/novelty
  '5942': 'or', // Book stores
  '5941': 'or', // Sporting goods
  '7941': 'or', // Sports clubs
  '8049': 'or', // Chiropractors
  '8042': 'or', // Optometrists
  '7298': 'or', // Health/beauty spas

  // Argent — 10%
  '5912': 'argent', // Pharmacies
  '5999': 'argent', // Miscellaneous retail
  '5732': 'argent', // Electronics stores
  '8011': 'argent', // Doctors
  '8062': 'argent', // Hospitals
  '8021': 'argent', // Dentists
  '8398': 'argent', // Charitable orgs

  // Bronze — 5%
  '5311': 'bronze', // Department stores
  '5300': 'bronze', // Wholesale clubs
  '5541': 'bronze', // Service stations
  '5542': 'bronze', // Fuel
  '4900': 'bronze', // Utilities

  // Gris — 1%
  '5812': 'gris', // Restaurants
  '5813': 'gris', // Bars
  '5651': 'gris', // Family clothing
  '5691': 'gris', // Men/women clothing

  // Sombre — 0% + alert
  '5814': 'sombre', // Fast food
  '5699': 'sombre', // Misc apparel (fast fashion)

  // Noir — 0% + question
  '5921': 'noir', // Package stores (alcohol)
  '5993': 'noir', // Cigar/tobacco
  '7995': 'noir', // Gambling
  '5944': 'noir', // Jewelry (luxury)
};

/**
 * Get the purity level for a given MCC code
 */
export function getPurityLevel(mcc: string): PurityTier {
  const level = MCC_MAP[mcc] ?? 'gris'; // Default to gris (1%)
  return PURITY_TIERS.find((t) => t.level === level) ?? PURITY_TIERS[4]; // fallback gris
}

/**
 * Calculate cashback for a transaction
 */
export function calculateCashback(
  amount: number,
  mcc: string,
  natureScore: number = 50 // 0-100 Nature Score (90-day avg)
): { cashback: number; level: PurityLevel; bonus_pct: number } {
  const tier = getPurityLevel(mcc);
  let baseCashback = tier.cashback_pct;

  // Nature Score bonus: +1% per 10 points above 50
  const bonus = Math.max(0, Math.floor((natureScore - 50) / 10));
  const totalPct = baseCashback + bonus;

  const cashback = Math.round(amount * totalPct / 100 * 100) / 100;

  return {
    cashback,
    level: tier.level,
    bonus_pct: bonus,
  };
}

/**
 * Calculate the Nature Score from activity history
 * Average over 90 days of healthy activities
 */
export function calculateNatureScore(
  activitiesLast90Days: number, // total activities logged
  daysActive: number, // days with at least 1 activity
): number {
  if (daysActive === 0) return 50; // baseline
  const avgPerDay = activitiesLast90Days / Math.max(daysActive, 1);
  // Score: 50 base + up to 50 based on daily average (cap at 5 activities/day)
  const bonus = Math.min(avgPerDay / 5, 1) * 50;
  return Math.round(50 + bonus);
}

/**
 * Check if a transaction should trigger an alert or question
 */
export function getTransactionAction(mcc: string): 'allow' | 'alert' | 'question' {
  const level = MCC_MAP[mcc] ?? 'gris';
  if (level === 'sombre') return 'alert';
  if (level === 'noir') return 'question';
  return 'allow';
}
