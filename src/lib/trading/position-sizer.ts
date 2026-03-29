// =============================================================================
// MIDAS — Position Sizer
// Calcul de taille de position : fixe, Kelly, ajustement volatilite
// =============================================================================

/**
 * Calculate position size based on fixed fractional risk
 * @param capital Total capital in USD
 * @param riskPct Risk percentage (e.g. 2 = 2%)
 * @param entryPrice Entry price of the asset
 * @param stopLossPrice Stop loss price
 * @returns Position size in units of the asset
 */
export function calculatePositionSize(
  capital: number,
  riskPct: number,
  entryPrice: number,
  stopLossPrice: number
): number {
  if (capital <= 0 || riskPct <= 0 || entryPrice <= 0 || stopLossPrice <= 0) {
    return 0;
  }

  const riskAmountUsd = capital * (riskPct / 100);
  const priceDifference = Math.abs(entryPrice - stopLossPrice);

  if (priceDifference === 0) {
    return 0;
  }

  const positionSize = riskAmountUsd / priceDifference;
  return Math.max(0, positionSize);
}

/**
 * Half-Kelly criterion for position sizing
 * Uses half-Kelly to reduce variance while capturing most of the edge
 * @param winRate Historical win rate (0-1)
 * @param avgWinLossRatio Average win / average loss (> 0)
 * @returns Fraction of capital to allocate (0-1), half-Kelly
 */
export function kellySize(winRate: number, avgWinLossRatio: number): number {
  if (winRate <= 0 || winRate >= 1 || avgWinLossRatio <= 0) {
    return 0;
  }

  // Kelly formula: f* = (bp - q) / b
  // where b = avg win/loss ratio, p = win rate, q = 1 - p
  const b = avgWinLossRatio;
  const p = winRate;
  const q = 1 - p;

  const fullKelly = (b * p - q) / b;

  // Half-Kelly for safety
  const halfKelly = fullKelly / 2;

  // Clamp between 0 and 25% (never risk more than a quarter)
  return Math.max(0, Math.min(0.25, halfKelly));
}

/**
 * Adjust position size based on current vs average ATR
 * Higher volatility = smaller position, lower volatility = larger position
 * @param baseSize Base position size in units
 * @param currentATR Current ATR value
 * @param avgATR Average ATR value over lookback period
 * @returns Adjusted position size
 */
export function adjustForVolatility(
  baseSize: number,
  currentATR: number,
  avgATR: number
): number {
  if (baseSize <= 0 || currentATR <= 0 || avgATR <= 0) {
    return 0;
  }

  // Ratio: if current volatility is 2x average, halve the position
  const volatilityRatio = avgATR / currentATR;

  // Clamp adjustment between 0.25x and 2x to avoid extreme sizing
  const clampedRatio = Math.max(0.25, Math.min(2.0, volatilityRatio));

  return baseSize * clampedRatio;
}

/**
 * Combined position sizing: fixed fractional + Kelly + volatility adjustment
 */
export function optimalPositionSize(params: {
  capital: number;
  riskPct: number;
  entryPrice: number;
  stopLossPrice: number;
  winRate: number;
  avgWinLossRatio: number;
  currentATR: number;
  avgATR: number;
}): {
  size: number;
  method: string;
  kellySuggestion: number;
  volatilityAdjustment: number;
} {
  const fixedSize = calculatePositionSize(
    params.capital,
    params.riskPct,
    params.entryPrice,
    params.stopLossPrice
  );

  const kellyFraction = kellySize(params.winRate, params.avgWinLossRatio);
  const kellyBasedSize = (params.capital * kellyFraction) / params.entryPrice;

  // Use the more conservative of the two
  const conservativeSize = Math.min(fixedSize, kellyBasedSize > 0 ? kellyBasedSize : fixedSize);

  // Adjust for volatility
  const finalSize = adjustForVolatility(conservativeSize, params.currentATR, params.avgATR);

  return {
    size: finalSize,
    method: kellyBasedSize > 0 && kellyBasedSize < fixedSize ? 'half-kelly' : 'fixed-fractional',
    kellySuggestion: kellyFraction,
    volatilityAdjustment: params.avgATR > 0 ? params.avgATR / params.currentATR : 1,
  };
}
