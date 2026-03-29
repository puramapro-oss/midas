// =============================================================================
// MIDAS — Derivatives Analysis
// Funding rate, open interest, long/short ratio interpretation
// Takes external data as input (from exchange APIs or aggregators)
// =============================================================================

// --- Types ---

export interface DerivativesData {
  funding_rate: number;           // e.g., 0.01 = 1% (positive = longs pay shorts)
  open_interest: number;          // Total open interest in USD
  open_interest_change_24h: number; // Percentage change (-1 to 1+)
  long_short_ratio: number;       // >1 = more longs, <1 = more shorts
  liquidations_long_24h: number;  // USD value of long liquidations
  liquidations_short_24h: number; // USD value of short liquidations
}

export interface DerivativesAnalysis {
  funding_signal: 'bullish' | 'bearish' | 'neutral';
  funding_interpretation: string;
  open_interest_signal: 'bullish' | 'bearish' | 'neutral';
  open_interest_interpretation: string;
  long_short_signal: 'bullish' | 'bearish' | 'neutral';
  long_short_interpretation: string;
  liquidation_pressure: 'long_squeeze' | 'short_squeeze' | 'balanced';
  overall_signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
}

// --- Analysis ---

export function analyzeDerivatives(data: DerivativesData): DerivativesAnalysis {
  // Funding rate interpretation (contrarian signal)
  // Very positive = too many longs = bearish (longs are crowded)
  // Very negative = too many shorts = bullish (shorts are crowded)
  let fundingSignal: 'bullish' | 'bearish' | 'neutral';
  let fundingInterpretation: string;

  if (data.funding_rate > 0.05) {
    fundingSignal = 'bearish';
    fundingInterpretation = `Funding extreme positif (${(data.funding_rate * 100).toFixed(3)}%) — Longs surcharges, correction probable`;
  } else if (data.funding_rate > 0.01) {
    fundingSignal = 'bearish';
    fundingInterpretation = `Funding positif (${(data.funding_rate * 100).toFixed(3)}%) — Biais haussier modere, prudence`;
  } else if (data.funding_rate > -0.01) {
    fundingSignal = 'neutral';
    fundingInterpretation = `Funding neutre (${(data.funding_rate * 100).toFixed(3)}%) — Marche equilibre`;
  } else if (data.funding_rate > -0.05) {
    fundingSignal = 'bullish';
    fundingInterpretation = `Funding negatif (${(data.funding_rate * 100).toFixed(3)}%) — Shorts paient, potentiel short squeeze`;
  } else {
    fundingSignal = 'bullish';
    fundingInterpretation = `Funding extreme negatif (${(data.funding_rate * 100).toFixed(3)}%) — Short squeeze imminent`;
  }

  // Open interest analysis
  // Rising OI + rising price = trend confirmation (bullish in uptrend)
  // Rising OI + falling price = bearish pressure
  // Falling OI = position unwinding
  let oiSignal: 'bullish' | 'bearish' | 'neutral';
  let oiInterpretation: string;

  if (data.open_interest_change_24h > 0.1) {
    oiSignal = 'neutral'; // Needs price context, but high OI increase = volatile
    oiInterpretation = `OI en forte hausse (+${(data.open_interest_change_24h * 100).toFixed(1)}%) — Nouvelles positions, mouvement fort attendu`;
  } else if (data.open_interest_change_24h > 0.02) {
    oiSignal = 'neutral';
    oiInterpretation = `OI en hausse moderee (+${(data.open_interest_change_24h * 100).toFixed(1)}%) — Interet croissant`;
  } else if (data.open_interest_change_24h > -0.02) {
    oiSignal = 'neutral';
    oiInterpretation = `OI stable (${(data.open_interest_change_24h * 100).toFixed(1)}%) — Consolidation`;
  } else {
    oiSignal = 'neutral';
    oiInterpretation = `OI en baisse (${(data.open_interest_change_24h * 100).toFixed(1)}%) — Positions se ferment, derisking`;
  }

  // Long/short ratio (contrarian)
  let lsSignal: 'bullish' | 'bearish' | 'neutral';
  let lsInterpretation: string;

  if (data.long_short_ratio > 2.0) {
    lsSignal = 'bearish';
    lsInterpretation = `Ratio L/S extreme (${data.long_short_ratio.toFixed(2)}) — Trop de longs, contrarian baissier`;
  } else if (data.long_short_ratio > 1.2) {
    lsSignal = 'bearish';
    lsInterpretation = `Ratio L/S eleve (${data.long_short_ratio.toFixed(2)}) — Biais long, risque de liquidation`;
  } else if (data.long_short_ratio >= 0.8) {
    lsSignal = 'neutral';
    lsInterpretation = `Ratio L/S equilibre (${data.long_short_ratio.toFixed(2)})`;
  } else if (data.long_short_ratio >= 0.5) {
    lsSignal = 'bullish';
    lsInterpretation = `Ratio L/S bas (${data.long_short_ratio.toFixed(2)}) — Plus de shorts, contrarian haussier`;
  } else {
    lsSignal = 'bullish';
    lsInterpretation = `Ratio L/S extreme bas (${data.long_short_ratio.toFixed(2)}) — Shorts surcharges, squeeze probable`;
  }

  // Liquidation pressure
  const totalLiqs = data.liquidations_long_24h + data.liquidations_short_24h;
  let liquidationPressure: 'long_squeeze' | 'short_squeeze' | 'balanced';

  if (totalLiqs > 0) {
    const longRatio = data.liquidations_long_24h / totalLiqs;
    if (longRatio > 0.7) liquidationPressure = 'long_squeeze';
    else if (longRatio < 0.3) liquidationPressure = 'short_squeeze';
    else liquidationPressure = 'balanced';
  } else {
    liquidationPressure = 'balanced';
  }

  // Overall signal
  let score = 0;
  const signalMap = { bullish: 1, bearish: -1, neutral: 0 };
  score += signalMap[fundingSignal] * 2; // Funding is strongest signal
  score += signalMap[lsSignal];

  if (liquidationPressure === 'short_squeeze') score += 1;
  else if (liquidationPressure === 'long_squeeze') score -= 1;

  let overallSignal: 'bullish' | 'bearish' | 'neutral';
  if (score >= 2) overallSignal = 'bullish';
  else if (score <= -2) overallSignal = 'bearish';
  else overallSignal = 'neutral';

  // Risk level based on extreme positioning
  let riskLevel: 'low' | 'medium' | 'high';
  const extremeFunding = Math.abs(data.funding_rate) > 0.03;
  const extremeRatio = data.long_short_ratio > 2 || data.long_short_ratio < 0.5;
  const highOIChange = Math.abs(data.open_interest_change_24h) > 0.1;

  if (extremeFunding && extremeRatio) riskLevel = 'high';
  else if (extremeFunding || extremeRatio || highOIChange) riskLevel = 'medium';
  else riskLevel = 'low';

  const confidence = Math.min(0.8, 0.4 + Math.abs(score) * 0.1 + (extremeFunding ? 0.1 : 0));

  return {
    funding_signal: fundingSignal,
    funding_interpretation: fundingInterpretation,
    open_interest_signal: oiSignal,
    open_interest_interpretation: oiInterpretation,
    long_short_signal: lsSignal,
    long_short_interpretation: lsInterpretation,
    liquidation_pressure: liquidationPressure,
    overall_signal: overallSignal,
    confidence,
    risk_level: riskLevel,
  };
}
