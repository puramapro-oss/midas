// =============================================================================
// MIDAS — Kelly Criterion Sizing
// Calcul de taille de position optimale via Kelly et variantes conservatrices
// =============================================================================

const MAX_CAPITAL_PCT = 0.05; // Jamais plus de 5% du capital

/**
 * Calcule la fraction Kelly complete.
 * f* = (b * p - q) / b
 * ou b = ratio win/loss moyen, p = taux de gain, q = 1 - p
 *
 * @param winRate - Taux de gain historique (0-1)
 * @param avgWinLossRatio - Ratio gain moyen / perte moyenne (> 0)
 * @returns Fraction du capital a allouer (0 a 1)
 */
export function kellyFraction(winRate: number, avgWinLossRatio: number): number {
  if (winRate <= 0 || winRate >= 1 || avgWinLossRatio <= 0) {
    return 0;
  }

  const b = avgWinLossRatio;
  const p = winRate;
  const q = 1 - p;

  const fraction = (b * p - q) / b;

  // Negative Kelly = no edge, don't trade
  return Math.max(0, fraction);
}

/**
 * Half-Kelly : reduit la variance significativement tout en conservant
 * environ 75% du rendement du Kelly complet.
 */
export function halfKelly(winRate: number, avgWinLossRatio: number): number {
  const full = kellyFraction(winRate, avgWinLossRatio);
  return Math.min(full / 2, MAX_CAPITAL_PCT);
}

/**
 * Quarter-Kelly : approche ultra-conservatrice pour capital preservation.
 * Conserve environ 50% du rendement avec une variance tres faible.
 */
export function quarterKelly(winRate: number, avgWinLossRatio: number): number {
  const full = kellyFraction(winRate, avgWinLossRatio);
  return Math.min(full / 4, MAX_CAPITAL_PCT);
}

/**
 * Calcule la taille optimale en USD selon le profil de risque.
 * Ne retourne jamais plus de 5% du capital.
 *
 * @param capital - Capital total en USD
 * @param winRate - Taux de gain historique (0-1)
 * @param avgWin - Gain moyen en USD par trade gagnant
 * @param avgLoss - Perte moyenne en USD par trade perdant (valeur absolue)
 * @param riskProfile - Profil de risque de l'utilisateur
 * @returns Montant en USD a risquer sur le prochain trade
 */
export function optimalSize(
  capital: number,
  winRate: number,
  avgWin: number,
  avgLoss: number,
  riskProfile: 'very_conservative' | 'conservative' | 'moderate' | 'aggressive'
): number {
  if (capital <= 0 || winRate <= 0 || winRate >= 1 || avgWin <= 0 || avgLoss <= 0) {
    return 0;
  }

  const avgWinLossRatio = avgWin / avgLoss;

  let fraction: number;

  switch (riskProfile) {
    case 'very_conservative':
      fraction = quarterKelly(winRate, avgWinLossRatio);
      break;
    case 'conservative':
      fraction = halfKelly(winRate, avgWinLossRatio);
      break;
    case 'moderate':
      fraction = halfKelly(winRate, avgWinLossRatio);
      break;
    case 'aggressive':
      // Even aggressive never uses full Kelly — cap at 3/4 Kelly
      fraction = Math.min(kellyFraction(winRate, avgWinLossRatio) * 0.75, MAX_CAPITAL_PCT);
      break;
    default:
      fraction = quarterKelly(winRate, avgWinLossRatio);
  }

  // Hard cap: never exceed 5% of capital
  const maxAmount = capital * MAX_CAPITAL_PCT;
  const kellyAmount = capital * fraction;

  return parseFloat(Math.min(kellyAmount, maxAmount).toFixed(2));
}

/**
 * Calcule les metriques Kelly detaillees pour affichage dans le dashboard.
 */
export function kellyMetrics(
  winRate: number,
  avgWinLossRatio: number
): {
  fullKelly: number;
  halfKelly: number;
  quarterKelly: number;
  hasEdge: boolean;
  expectedValue: number;
  kellyGrowthRate: number;
} {
  const full = kellyFraction(winRate, avgWinLossRatio);
  const half = halfKelly(winRate, avgWinLossRatio);
  const quarter = quarterKelly(winRate, avgWinLossRatio);

  // Expected value per trade as a fraction of amount risked
  const ev = winRate * avgWinLossRatio - (1 - winRate);

  // Kelly growth rate: expected log growth of capital
  // G = p * ln(1 + b * f) + q * ln(1 - f) where f = Kelly fraction
  let growthRate = 0;
  if (full > 0 && full < 1) {
    const p = winRate;
    const q = 1 - winRate;
    const b = avgWinLossRatio;
    growthRate = p * Math.log(1 + b * full) + q * Math.log(1 - full);
  }

  return {
    fullKelly: parseFloat(full.toFixed(4)),
    halfKelly: parseFloat(half.toFixed(4)),
    quarterKelly: parseFloat(quarter.toFixed(4)),
    hasEdge: full > 0,
    expectedValue: parseFloat(ev.toFixed(4)),
    kellyGrowthRate: parseFloat(growthRate.toFixed(6)),
  };
}
