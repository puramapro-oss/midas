// =============================================================================
// MIDAS — Slippage Estimator
// Estimation du slippage et des couts reels d'execution d'un trade
// =============================================================================

const MAJOR_PAIRS = new Set([
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'SOL/USDT',
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT',
]);

const MID_CAP_PAIRS = new Set([
  'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT', 'LINK/USDT',
  'DOGE/USDT', 'ATOM/USDT', 'UNI/USDT', 'LTC/USDT', 'FIL/USDT',
  'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT',
  'DOGEUSDT', 'ATOMUSDT', 'UNIUSDT', 'LTCUSDT', 'FILUSDT',
]);

// Typical exchange fees (taker)
const TAKER_FEE_PCT = 0.1;
const MAKER_FEE_PCT = 0.075;

export interface SlippageEstimate {
  estimatedSlippagePct: number;
  estimatedFees: number;
  totalCost: number;
  isProfitableAfterCosts: boolean;
  adjustedRiskReward: number;
}

/**
 * Calcule le slippage de base en fonction du tier de la paire.
 */
function getBaseSlippagePct(pair: string): number {
  const normalizedPair = pair.toUpperCase().replace('-', '/');

  if (MAJOR_PAIRS.has(normalizedPair) || MAJOR_PAIRS.has(normalizedPair.replace('/', ''))) {
    return 0.01; // 0.01% for BTC, ETH etc.
  }

  if (MID_CAP_PAIRS.has(normalizedPair) || MID_CAP_PAIRS.has(normalizedPair.replace('/', ''))) {
    return 0.05; // 0.05% for mid-caps
  }

  return 0.15; // 0.15% for small altcoins
}

/**
 * Estime le slippage et les couts d'execution d'un trade.
 *
 * @param pair - Paire de trading (ex: 'BTC/USDT')
 * @param orderSize - Taille de l'ordre en USD
 * @param currentPrice - Prix actuel de l'actif
 * @param avgVolume24h - Volume moyen sur 24h en USD
 * @returns Estimation detaillee des couts
 */
export function estimateSlippage(
  pair: string,
  orderSize: number,
  currentPrice: number,
  avgVolume24h: number
): SlippageEstimate {
  if (orderSize <= 0 || currentPrice <= 0) {
    return {
      estimatedSlippagePct: 0,
      estimatedFees: 0,
      totalCost: 0,
      isProfitableAfterCosts: false,
      adjustedRiskReward: 0,
    };
  }

  const baseSlippage = getBaseSlippagePct(pair);

  // Volume impact: larger orders relative to volume = more slippage
  // Rule of thumb: order > 0.1% of daily volume starts impacting price significantly
  let volumeImpactMultiplier = 1;
  if (avgVolume24h > 0) {
    const orderToVolumeRatio = orderSize / avgVolume24h;

    if (orderToVolumeRatio > 0.01) {
      // Order is > 1% of daily volume — serious impact
      volumeImpactMultiplier = 5 + (orderToVolumeRatio - 0.01) * 500;
    } else if (orderToVolumeRatio > 0.001) {
      // Order is 0.1% - 1% of daily volume — moderate impact
      volumeImpactMultiplier = 1.5 + (orderToVolumeRatio - 0.001) * 350;
    } else if (orderToVolumeRatio > 0.0001) {
      // Order is 0.01% - 0.1% of daily volume — minor impact
      volumeImpactMultiplier = 1 + (orderToVolumeRatio - 0.0001) * 500;
    }
  } else {
    // No volume data — assume high slippage
    volumeImpactMultiplier = 10;
  }

  const estimatedSlippagePct = parseFloat(
    Math.min(5, baseSlippage * volumeImpactMultiplier).toFixed(4)
  );

  // Fees (taker fee for market orders)
  const estimatedFees = parseFloat((orderSize * (TAKER_FEE_PCT / 100)).toFixed(2));

  // Slippage cost in USD
  const slippageCost = parseFloat((orderSize * (estimatedSlippagePct / 100)).toFixed(2));

  // Total execution cost
  const totalCost = parseFloat((estimatedFees + slippageCost).toFixed(2));

  return {
    estimatedSlippagePct,
    estimatedFees,
    totalCost,
    isProfitableAfterCosts: false, // Caller must set based on expected profit
    adjustedRiskReward: 0, // Caller must set based on strategy
  };
}

/**
 * Estime le slippage et verifie si le trade reste profitable apres couts.
 *
 * @param pair - Paire de trading
 * @param orderSize - Taille de l'ordre en USD
 * @param currentPrice - Prix actuel
 * @param avgVolume24h - Volume 24h en USD
 * @param expectedProfitPct - Profit attendu en % (ex: 3 = 3%)
 * @param riskRewardRatio - Ratio risk/reward initial
 * @returns Estimation complete avec profitabilite ajustee
 */
export function estimateSlippageWithProfitCheck(
  pair: string,
  orderSize: number,
  currentPrice: number,
  avgVolume24h: number,
  expectedProfitPct: number,
  riskRewardRatio: number
): SlippageEstimate {
  const base = estimateSlippage(pair, orderSize, currentPrice, avgVolume24h);

  // Total cost percentage (entry slippage + exit slippage + 2x fees)
  const totalCostPct = base.estimatedSlippagePct * 2 + (TAKER_FEE_PCT * 2);
  const totalCostUsd = parseFloat((orderSize * (totalCostPct / 100)).toFixed(2));

  const expectedProfitUsd = orderSize * (expectedProfitPct / 100);
  const isProfitable = expectedProfitUsd > totalCostUsd;

  // Adjusted risk/reward: reduce the reward by execution costs
  const adjustedRewardPct = expectedProfitPct - totalCostPct;
  const riskPct = riskRewardRatio > 0 ? expectedProfitPct / riskRewardRatio : expectedProfitPct;
  const adjustedRR = riskPct > 0 ? adjustedRewardPct / riskPct : 0;

  return {
    estimatedSlippagePct: base.estimatedSlippagePct,
    estimatedFees: parseFloat((base.estimatedFees * 2).toFixed(2)), // Round-trip fees
    totalCost: totalCostUsd,
    isProfitableAfterCosts: isProfitable,
    adjustedRiskReward: parseFloat(Math.max(0, adjustedRR).toFixed(2)),
  };
}

/**
 * Recommande la methode d'execution optimale.
 */
export function recommendExecutionMethod(
  orderSize: number,
  avgVolume24h: number,
  urgency: 'low' | 'medium' | 'high'
): {
  method: 'market' | 'limit' | 'twap' | 'iceberg';
  reason: string;
  estimatedSaving: number;
} {
  if (avgVolume24h <= 0) {
    return {
      method: 'limit',
      reason: 'No volume data — use limit order for price protection',
      estimatedSaving: 0,
    };
  }

  const orderToVolumeRatio = orderSize / avgVolume24h;

  if (orderToVolumeRatio > 0.01) {
    // Very large order relative to volume
    const saving = orderSize * 0.002; // ~0.2% saving from splitting
    return {
      method: 'twap',
      reason: `Order is ${(orderToVolumeRatio * 100).toFixed(2)}% of daily volume — split over time`,
      estimatedSaving: parseFloat(saving.toFixed(2)),
    };
  }

  if (orderToVolumeRatio > 0.005) {
    const saving = orderSize * 0.001;
    return {
      method: 'iceberg',
      reason: 'Moderate size relative to volume — use iceberg to hide full size',
      estimatedSaving: parseFloat(saving.toFixed(2)),
    };
  }

  if (urgency === 'high') {
    return {
      method: 'market',
      reason: 'Small order with high urgency — market execution is fine',
      estimatedSaving: 0,
    };
  }

  const saving = orderSize * (TAKER_FEE_PCT - MAKER_FEE_PCT) / 100;
  return {
    method: 'limit',
    reason: 'Standard size — limit order saves on fees',
    estimatedSaving: parseFloat(saving.toFixed(2)),
  };
}
