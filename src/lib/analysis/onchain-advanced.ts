// =============================================================================
// MIDAS — Advanced On-Chain Analysis
// MVRV ratio, NVT ratio, exchange reserves interpretation
// Takes aggregated on-chain metrics as input
// =============================================================================

// --- Types ---

export interface OnChainMetrics {
  mvrv_ratio: number;            // Market Value to Realized Value
  nvt_ratio: number;             // Network Value to Transactions
  exchange_reserve: number;      // Total BTC/ETH on exchanges
  exchange_reserve_change_30d: number; // Percentage change in 30 days
  active_addresses_24h: number;
  active_addresses_change_7d: number; // Percentage change
  hash_rate?: number;            // BTC specific
  hash_rate_change_30d?: number;
  stablecoin_supply?: number;    // Total stablecoin market cap
  stablecoin_supply_change_30d?: number;
}

export interface AdvancedOnChainAnalysis {
  mvrv_signal: 'bullish' | 'bearish' | 'neutral';
  mvrv_interpretation: string;
  mvrv_zone: 'deep_value' | 'undervalued' | 'fair_value' | 'overvalued' | 'overheated';
  nvt_signal: 'bullish' | 'bearish' | 'neutral';
  nvt_interpretation: string;
  exchange_reserve_signal: 'bullish' | 'bearish' | 'neutral';
  exchange_reserve_interpretation: string;
  network_health: 'strong' | 'moderate' | 'weak';
  overall_signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

// --- Analysis ---

export function analyzeOnChainAdvanced(metrics: OnChainMetrics): AdvancedOnChainAnalysis {
  // MVRV Ratio interpretation
  // < 1: market cap below realized cap = undervalued (holders are at a loss on average)
  // 1-2: fair value
  // 2-3.5: getting overvalued
  // > 3.5: overheated, historically precedes corrections
  let mvrvSignal: 'bullish' | 'bearish' | 'neutral';
  let mvrvInterpretation: string;
  let mvrvZone: 'deep_value' | 'undervalued' | 'fair_value' | 'overvalued' | 'overheated';

  if (metrics.mvrv_ratio < 0.8) {
    mvrvSignal = 'bullish';
    mvrvZone = 'deep_value';
    mvrvInterpretation = `MVRV ${metrics.mvrv_ratio.toFixed(2)} — Zone de deep value, capitulation historique, forte opportunite achat`;
  } else if (metrics.mvrv_ratio < 1.0) {
    mvrvSignal = 'bullish';
    mvrvZone = 'undervalued';
    mvrvInterpretation = `MVRV ${metrics.mvrv_ratio.toFixed(2)} — Sous-evalue, la majorite des holders sont en perte`;
  } else if (metrics.mvrv_ratio < 2.0) {
    mvrvSignal = 'neutral';
    mvrvZone = 'fair_value';
    mvrvInterpretation = `MVRV ${metrics.mvrv_ratio.toFixed(2)} — Zone de valeur juste`;
  } else if (metrics.mvrv_ratio < 3.5) {
    mvrvSignal = 'bearish';
    mvrvZone = 'overvalued';
    mvrvInterpretation = `MVRV ${metrics.mvrv_ratio.toFixed(2)} — Surevalaution, profits non realises eleves`;
  } else {
    mvrvSignal = 'bearish';
    mvrvZone = 'overheated';
    mvrvInterpretation = `MVRV ${metrics.mvrv_ratio.toFixed(2)} — Surchauffe, correction historiquement imminente`;
  }

  // NVT Ratio interpretation
  // Low NVT (< 30): network is transacting a lot relative to its value = bullish
  // Medium NVT (30-65): fair
  // High NVT (> 65): network is overvalued relative to its transaction volume
  // Very high NVT (> 95): speculative bubble territory
  let nvtSignal: 'bullish' | 'bearish' | 'neutral';
  let nvtInterpretation: string;

  if (metrics.nvt_ratio < 30) {
    nvtSignal = 'bullish';
    nvtInterpretation = `NVT ${metrics.nvt_ratio.toFixed(1)} — Forte utilisation du reseau, valeur supportee par l'activite`;
  } else if (metrics.nvt_ratio < 65) {
    nvtSignal = 'neutral';
    nvtInterpretation = `NVT ${metrics.nvt_ratio.toFixed(1)} — Ratio equilibre entre valeur et utilisation`;
  } else if (metrics.nvt_ratio < 95) {
    nvtSignal = 'bearish';
    nvtInterpretation = `NVT ${metrics.nvt_ratio.toFixed(1)} — Valeur elevee par rapport a l'utilisation reelle`;
  } else {
    nvtSignal = 'bearish';
    nvtInterpretation = `NVT ${metrics.nvt_ratio.toFixed(1)} — Zone speculative, deconnexion valeur/utilisation`;
  }

  // Exchange reserves
  // Decreasing reserves = bullish (coins moving to cold storage, hodling)
  // Increasing reserves = bearish (coins moving to exchanges for selling)
  let exchangeSignal: 'bullish' | 'bearish' | 'neutral';
  let exchangeInterpretation: string;

  if (metrics.exchange_reserve_change_30d < -5) {
    exchangeSignal = 'bullish';
    exchangeInterpretation = `Reserves exchanges en forte baisse (${metrics.exchange_reserve_change_30d.toFixed(1)}%) — Accumulation, offre reduite`;
  } else if (metrics.exchange_reserve_change_30d < -1) {
    exchangeSignal = 'bullish';
    exchangeInterpretation = `Reserves exchanges en baisse (${metrics.exchange_reserve_change_30d.toFixed(1)}%) — Tendance a l'accumulation`;
  } else if (metrics.exchange_reserve_change_30d <= 1) {
    exchangeSignal = 'neutral';
    exchangeInterpretation = `Reserves exchanges stables (${metrics.exchange_reserve_change_30d.toFixed(1)}%)`;
  } else if (metrics.exchange_reserve_change_30d <= 5) {
    exchangeSignal = 'bearish';
    exchangeInterpretation = `Reserves exchanges en hausse (${metrics.exchange_reserve_change_30d.toFixed(1)}%) — Pression vendeuse potentielle`;
  } else {
    exchangeSignal = 'bearish';
    exchangeInterpretation = `Reserves exchanges en forte hausse (${metrics.exchange_reserve_change_30d.toFixed(1)}%) — Ventes massives probables`;
  }

  // Network health based on active addresses
  let networkHealth: 'strong' | 'moderate' | 'weak';

  if (metrics.active_addresses_change_7d > 5) {
    networkHealth = 'strong';
  } else if (metrics.active_addresses_change_7d > -5) {
    networkHealth = 'moderate';
  } else {
    networkHealth = 'weak';
  }

  // Overall signal
  const signalMap = { bullish: 1, bearish: -1, neutral: 0 };
  let score = 0;
  score += signalMap[mvrvSignal] * 2; // MVRV is the strongest on-chain signal
  score += signalMap[nvtSignal];
  score += signalMap[exchangeSignal] * 1.5;

  if (networkHealth === 'strong') score += 0.5;
  else if (networkHealth === 'weak') score -= 0.5;

  // Stablecoin supply boost: rising stablecoins = dry powder = bullish
  if (metrics.stablecoin_supply_change_30d !== undefined) {
    if (metrics.stablecoin_supply_change_30d > 5) score += 0.5;
    else if (metrics.stablecoin_supply_change_30d < -5) score -= 0.5;
  }

  let overallSignal: 'bullish' | 'bearish' | 'neutral';
  if (score >= 2) overallSignal = 'bullish';
  else if (score <= -2) overallSignal = 'bearish';
  else overallSignal = 'neutral';

  const confidence = Math.min(0.8, 0.4 + Math.abs(score) * 0.08);

  return {
    mvrv_signal: mvrvSignal,
    mvrv_interpretation: mvrvInterpretation,
    mvrv_zone: mvrvZone,
    nvt_signal: nvtSignal,
    nvt_interpretation: nvtInterpretation,
    exchange_reserve_signal: exchangeSignal,
    exchange_reserve_interpretation: exchangeInterpretation,
    network_health: networkHealth,
    overall_signal: overallSignal,
    confidence,
  };
}
