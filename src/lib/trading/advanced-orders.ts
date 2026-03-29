// =============================================================================
// MIDAS — Advanced Orders
// Scale-in, scale-out, pyramiding strategies pour des entrees/sorties optimales
// =============================================================================

export interface ScalingOrder {
  price: number;
  pctOfPosition: number;
  type: 'limit' | 'market';
}

export interface ScalingPlan {
  orders: ScalingOrder[];
}

export interface PyramidConfig {
  addAtProfitPct: number;
  addSizePct: number;
  maxPyramids: number;
  moveStopToBreakeven: boolean;
}

/**
 * Cree un plan de scale-in : repartit l'entree sur plusieurs niveaux de prix.
 * Chaque niveau est un peu en dessous du precedent (achat) pour moyenner a la baisse.
 *
 * @param entryPrice - Prix d'entree cible
 * @param levels - Nombre de niveaux (2-10)
 * @param spreadPct - Ecart total en % entre le premier et dernier niveau
 * @returns Plan avec ordres repartis
 */
export function createScaleInPlan(
  entryPrice: number,
  levels: number,
  spreadPct: number
): ScalingPlan {
  if (entryPrice <= 0 || levels < 1 || spreadPct <= 0) {
    return { orders: [] };
  }

  const clampedLevels = Math.min(10, Math.max(1, Math.round(levels)));
  const clampedSpread = Math.min(20, spreadPct);

  if (clampedLevels === 1) {
    return {
      orders: [{ price: entryPrice, pctOfPosition: 100, type: 'limit' }],
    };
  }

  const orders: ScalingOrder[] = [];
  const stepPct = clampedSpread / (clampedLevels - 1);

  // Allocate more size to lower prices (better entries get more weight)
  // Weights: 1, 2, 3, ..., N — linearly increasing toward lower prices
  const weights: number[] = [];
  let totalWeight = 0;
  for (let i = 0; i < clampedLevels; i++) {
    const weight = i + 1;
    weights.push(weight);
    totalWeight += weight;
  }

  for (let i = 0; i < clampedLevels; i++) {
    const pricePct = 1 - (stepPct * i) / 100;
    const price = parseFloat((entryPrice * pricePct).toFixed(8));
    const pctOfPosition = parseFloat(((weights[i] / totalWeight) * 100).toFixed(2));

    orders.push({
      price,
      pctOfPosition,
      type: i === 0 ? 'market' : 'limit',
    });
  }

  return { orders };
}

/**
 * Cree un plan de scale-out : repartit les sorties sur plusieurs niveaux de profit.
 *
 * @param entryPrice - Prix d'entree
 * @param takeProfitPct - Take profit total en % (ex: 10 = +10%)
 * @param levels - Nombre de niveaux de sortie (2-10)
 * @returns Plan avec ordres de sortie repartis
 */
export function createScaleOutPlan(
  entryPrice: number,
  takeProfitPct: number,
  levels: number
): ScalingPlan {
  if (entryPrice <= 0 || takeProfitPct <= 0 || levels < 1) {
    return { orders: [] };
  }

  const clampedLevels = Math.min(10, Math.max(1, Math.round(levels)));
  const clampedTP = Math.min(100, takeProfitPct);

  if (clampedLevels === 1) {
    const price = parseFloat((entryPrice * (1 + clampedTP / 100)).toFixed(8));
    return {
      orders: [{ price, pctOfPosition: 100, type: 'limit' }],
    };
  }

  const orders: ScalingOrder[] = [];
  const stepPct = clampedTP / clampedLevels;

  // Allocate more weight to earlier exits (secure profits progressively)
  // First exits take more, last exit takes less but at higher price
  // Weights: N, N-1, ..., 1 — decreasing allocation toward higher prices
  const weights: number[] = [];
  let totalWeight = 0;
  for (let i = 0; i < clampedLevels; i++) {
    const weight = clampedLevels - i;
    weights.push(weight);
    totalWeight += weight;
  }

  for (let i = 0; i < clampedLevels; i++) {
    const targetPct = stepPct * (i + 1);
    const price = parseFloat((entryPrice * (1 + targetPct / 100)).toFixed(8));
    const pctOfPosition = parseFloat(((weights[i] / totalWeight) * 100).toFixed(2));

    orders.push({
      price,
      pctOfPosition,
      type: 'limit',
    });
  }

  return { orders };
}

/**
 * Determine si on doit ajouter a une position gagnante (pyramiding).
 *
 * @param currentPnlPct - PnL actuel en % de la position
 * @param pyramidsDone - Nombre de pyramides deja realisees
 * @param config - Configuration du pyramiding
 * @returns true si on doit pyramider
 */
export function shouldPyramid(
  currentPnlPct: number,
  pyramidsDone: number,
  config: PyramidConfig
): boolean {
  if (pyramidsDone >= config.maxPyramids) {
    return false;
  }

  if (config.addAtProfitPct <= 0 || config.addSizePct <= 0) {
    return false;
  }

  // Each pyramid level requires a higher profit threshold
  // Level 1: addAtProfitPct, Level 2: 2x addAtProfitPct, etc.
  const requiredPnlPct = config.addAtProfitPct * (pyramidsDone + 1);

  return currentPnlPct >= requiredPnlPct;
}

/**
 * Calcule la taille d'ajout pour un pyramid.
 * Chaque ajout est plus petit que le precedent pour controler le risque.
 *
 * @param basePositionSize - Taille de la position initiale
 * @param pyramidsDone - Nombre de pyramides deja realisees
 * @param config - Configuration du pyramiding
 * @returns Taille de la position a ajouter
 */
export function calculatePyramidSize(
  basePositionSize: number,
  pyramidsDone: number,
  config: PyramidConfig
): number {
  if (basePositionSize <= 0 || pyramidsDone >= config.maxPyramids) {
    return 0;
  }

  // Each subsequent pyramid adds a smaller percentage
  // Level 1: addSizePct%, Level 2: addSizePct/2%, Level 3: addSizePct/3%, etc.
  const decayFactor = 1 / (pyramidsDone + 1);
  const adjustedPct = config.addSizePct * decayFactor;

  return parseFloat((basePositionSize * (adjustedPct / 100)).toFixed(8));
}

/**
 * Calcule le nouveau stop-loss apres un pyramid.
 */
export function calculatePyramidStopLoss(
  entries: Array<{ price: number; size: number }>,
  config: PyramidConfig
): number {
  if (entries.length === 0) return 0;

  if (config.moveStopToBreakeven && entries.length > 1) {
    // Weighted average entry = breakeven point
    let totalCost = 0;
    let totalSize = 0;
    for (const entry of entries) {
      totalCost += entry.price * entry.size;
      totalSize += entry.size;
    }
    return totalSize > 0 ? parseFloat((totalCost / totalSize).toFixed(8)) : 0;
  }

  // Otherwise return the original entry price as stop
  return entries[0].price;
}
