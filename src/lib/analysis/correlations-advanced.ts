// =============================================================================
// MIDAS — Advanced Correlations Analysis
// Pearson correlation, BTC dominance, altseason detection, macro risk
// =============================================================================

// --- Types ---

export interface CorrelationPair {
  asset_a: string;
  asset_b: string;
  correlation: number; // -1 to 1
  period_days: number;
}

export interface AltseasonData {
  top_alts_outperforming_btc: number; // Count
  total_top_alts: number;
  altseason_index: number; // 0-100
}

export interface MacroData {
  dxy_trend: 'rising' | 'falling' | 'flat';
  sp500_trend: 'rising' | 'falling' | 'flat';
  vix_level: number;
  fed_rate_trend: 'hawkish' | 'dovish' | 'neutral';
  us10y_yield_trend: 'rising' | 'falling' | 'flat';
}

export interface CorrelationAnalysis {
  btc_dominance: number;
  btc_dominance_trend: 'rising' | 'falling' | 'stable';
  is_altseason: boolean;
  altseason_confidence: number;
  correlations: CorrelationPair[];
  macro_risk_score: number; // 0-100 (0 = low risk, 100 = high risk)
  macro_interpretation: string;
  overall_signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

// --- Pearson Correlation ---

export function calculatePearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;

  const sliceA = a.slice(-n);
  const sliceB = b.slice(-n);

  let sumA = 0;
  let sumB = 0;
  let sumAB = 0;
  let sumA2 = 0;
  let sumB2 = 0;

  for (let i = 0; i < n; i++) {
    sumA += sliceA[i];
    sumB += sliceB[i];
    sumAB += sliceA[i] * sliceB[i];
    sumA2 += sliceA[i] * sliceA[i];
    sumB2 += sliceB[i] * sliceB[i];
  }

  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  if (denominator === 0) return 0;

  return Math.max(-1, Math.min(1, numerator / denominator));
}

// --- Altseason Detection ---

function detectAltseason(data: AltseasonData): { isAltseason: boolean; confidence: number } {
  // Altseason: >75% of top alts outperform BTC over 90 days
  const percentage = data.total_top_alts > 0
    ? (data.top_alts_outperforming_btc / data.total_top_alts) * 100
    : 0;

  const isAltseason = percentage > 75;
  const confidence = isAltseason
    ? Math.min(0.9, 0.5 + (percentage - 75) * 0.02)
    : Math.min(0.7, percentage / 100);

  return { isAltseason, confidence };
}

// --- Macro Risk Score ---

function calculateMacroRisk(macro: MacroData): { score: number; interpretation: string } {
  let risk = 50; // Start neutral

  // DXY rising = risk-off = bearish for crypto
  if (macro.dxy_trend === 'rising') risk += 15;
  else if (macro.dxy_trend === 'falling') risk -= 10;

  // SP500 falling = risk-off
  if (macro.sp500_trend === 'falling') risk += 15;
  else if (macro.sp500_trend === 'rising') risk -= 10;

  // VIX (fear index)
  if (macro.vix_level > 30) risk += 20;
  else if (macro.vix_level > 20) risk += 10;
  else if (macro.vix_level < 15) risk -= 10;

  // Fed policy
  if (macro.fed_rate_trend === 'hawkish') risk += 15;
  else if (macro.fed_rate_trend === 'dovish') risk -= 15;

  // 10Y yield
  if (macro.us10y_yield_trend === 'rising') risk += 10;
  else if (macro.us10y_yield_trend === 'falling') risk -= 5;

  risk = Math.max(0, Math.min(100, risk));

  let interpretation: string;
  if (risk < 25) {
    interpretation = 'Environnement macro tres favorable aux actifs risques (crypto inclus)';
  } else if (risk < 45) {
    interpretation = 'Environnement macro moderement favorable';
  } else if (risk < 60) {
    interpretation = 'Environnement macro neutre, surveiller les catalyseurs';
  } else if (risk < 80) {
    interpretation = 'Environnement macro defavorable, prudence sur les actifs risques';
  } else {
    interpretation = 'Environnement macro tres risque, mode defensif recommande';
  }

  return { score: risk, interpretation };
}

// --- Main Analysis ---

export function analyzeCorrelations(params: {
  btc_dominance: number;
  btc_dominance_prev_30d: number;
  altseason_data: AltseasonData;
  macro_data: MacroData;
  price_arrays?: { asset: string; prices: number[] }[];
}): CorrelationAnalysis {
  const { btc_dominance, btc_dominance_prev_30d, altseason_data, macro_data, price_arrays } = params;

  // BTC dominance trend
  const domChange = btc_dominance - btc_dominance_prev_30d;
  let btcDominanceTrend: 'rising' | 'falling' | 'stable';
  if (domChange > 2) btcDominanceTrend = 'rising';
  else if (domChange < -2) btcDominanceTrend = 'falling';
  else btcDominanceTrend = 'stable';

  // Altseason
  const altResult = detectAltseason(altseason_data);

  // Correlations between provided price arrays
  const correlations: CorrelationPair[] = [];
  if (price_arrays && price_arrays.length >= 2) {
    for (let i = 0; i < price_arrays.length; i++) {
      for (let j = i + 1; j < price_arrays.length; j++) {
        const corr = calculatePearsonCorrelation(
          price_arrays[i].prices,
          price_arrays[j].prices
        );
        correlations.push({
          asset_a: price_arrays[i].asset,
          asset_b: price_arrays[j].asset,
          correlation: Math.round(corr * 1000) / 1000,
          period_days: Math.min(price_arrays[i].prices.length, price_arrays[j].prices.length),
        });
      }
    }
  }

  // Macro risk
  const macroResult = calculateMacroRisk(macro_data);

  // Overall signal
  let score = 0;

  // Low macro risk = bullish, high = bearish
  if (macroResult.score < 35) score += 1;
  else if (macroResult.score > 65) score -= 1;

  // BTC dominance falling + altseason = bullish for alts
  if (btcDominanceTrend === 'falling' && altResult.isAltseason) score += 1;
  else if (btcDominanceTrend === 'rising' && !altResult.isAltseason) score -= 0.5;

  // Dovish Fed = bullish
  if (macro_data.fed_rate_trend === 'dovish') score += 1;
  else if (macro_data.fed_rate_trend === 'hawkish') score -= 1;

  let overallSignal: 'bullish' | 'bearish' | 'neutral';
  if (score >= 1.5) overallSignal = 'bullish';
  else if (score <= -1.5) overallSignal = 'bearish';
  else overallSignal = 'neutral';

  const confidence = Math.min(0.75, 0.35 + Math.abs(score) * 0.1);

  return {
    btc_dominance: btc_dominance,
    btc_dominance_trend: btcDominanceTrend,
    is_altseason: altResult.isAltseason,
    altseason_confidence: altResult.confidence,
    correlations,
    macro_risk_score: macroResult.score,
    macro_interpretation: macroResult.interpretation,
    overall_signal: overallSignal,
    confidence,
  };
}
