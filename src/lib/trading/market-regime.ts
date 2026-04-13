// =============================================================================
// MIDAS — Market Regime Detection
// Detection du regime de marche pour adapter les strategies
// =============================================================================

import type { MarketRegime, Candle } from '@/lib/agents/types';
import { getCurrentIndex } from '@/lib/data/fear-greed';

export interface RegimeAnalysis {
  regime: MarketRegime;
  confidence: number;
  duration: number;
  allowedStrategies: string[];
}

const STRATEGY_MAP: Record<MarketRegime, string[]> = {
  strong_bull: ['momentum', 'breakout', 'trend_following', 'pyramid'],
  weak_bull: ['momentum', 'trend_following', 'mean_reversion'],
  ranging: ['mean_reversion', 'grid', 'range_trading'],
  weak_bear: ['mean_reversion', 'short_momentum', 'hedging'],
  strong_bear: ['short_momentum', 'hedging', 'cash'],
  crash: ['cash', 'hedging', 'dca_buy'],
  high_volatility: ['volatility_breakout', 'straddle', 'grid'],
  low_volatility: ['mean_reversion', 'grid', 'accumulate'],
};

/**
 * Detecte le regime de marche actuel a partir des donnees de prix et indicateurs.
 *
 * @param candles - Bougies historiques (au moins 50 pour une analyse fiable)
 * @param adx - Average Directional Index (0-100, >25 = trend)
 * @param ema200Position - Prix actuel par rapport a l'EMA 200
 * @param atr - Average True Range actuel
 * @param avgAtr - ATR moyen sur la periode de reference
 * @returns Analyse du regime avec strategies autorisees
 */
export function detectRegime(
  candles: Candle[],
  adx: number,
  ema200Position: 'above' | 'below',
  atr: number,
  avgAtr: number,
  /** Fear & Greed actuel (optionnel — brief : F&G<10 + price -15%/7j = crash) */
  fearGreedValue?: number
): RegimeAnalysis {
  if (candles.length < 10) {
    return {
      regime: 'ranging',
      confidence: 0.2,
      duration: 0,
      allowedStrategies: STRATEGY_MAP['ranging'],
    };
  }

  // Calculate recent price momentum
  const recentCandles = candles.slice(-20);
  const priceChange = calculatePriceChange(recentCandles);
  const volatilityRatio = avgAtr > 0 ? atr / avgAtr : 1;

  // Detect crash conditions first (highest priority)
  const crashCheck = detectCrash(candles, fearGreedValue);
  if (crashCheck.isCrash) {
    return {
      regime: 'crash',
      confidence: crashCheck.confidence,
      duration: crashCheck.duration,
      allowedStrategies: STRATEGY_MAP['crash'],
    };
  }

  // High/low volatility regimes
  if (volatilityRatio > 2.0 && adx < 20) {
    const duration = countRegimeDuration(candles, 'high_volatility', avgAtr);
    return {
      regime: 'high_volatility',
      confidence: Math.min(0.95, 0.5 + (volatilityRatio - 2) * 0.15),
      duration,
      allowedStrategies: STRATEGY_MAP['high_volatility'],
    };
  }

  if (volatilityRatio < 0.5 && adx < 15) {
    const duration = countRegimeDuration(candles, 'low_volatility', avgAtr);
    return {
      regime: 'low_volatility',
      confidence: Math.min(0.95, 0.5 + (0.5 - volatilityRatio) * 0.9),
      duration,
      allowedStrategies: STRATEGY_MAP['low_volatility'],
    };
  }

  // Trend-based regimes
  const isTrending = adx > 25;
  const isAboveEma200 = ema200Position === 'above';

  if (isTrending && isAboveEma200 && priceChange > 5) {
    const confidence = calculateTrendConfidence(adx, priceChange, volatilityRatio, true);
    const duration = countRegimeDuration(candles, 'strong_bull', avgAtr);
    return {
      regime: 'strong_bull',
      confidence,
      duration,
      allowedStrategies: STRATEGY_MAP['strong_bull'],
    };
  }

  if (isAboveEma200 && priceChange > 0) {
    const confidence = calculateTrendConfidence(adx, priceChange, volatilityRatio, true);
    const duration = countRegimeDuration(candles, 'weak_bull', avgAtr);
    return {
      regime: 'weak_bull',
      confidence: Math.min(confidence, 0.75),
      duration,
      allowedStrategies: STRATEGY_MAP['weak_bull'],
    };
  }

  if (isTrending && !isAboveEma200 && priceChange < -5) {
    const confidence = calculateTrendConfidence(adx, Math.abs(priceChange), volatilityRatio, false);
    const duration = countRegimeDuration(candles, 'strong_bear', avgAtr);
    return {
      regime: 'strong_bear',
      confidence,
      duration,
      allowedStrategies: STRATEGY_MAP['strong_bear'],
    };
  }

  if (!isAboveEma200 && priceChange < 0) {
    const confidence = calculateTrendConfidence(adx, Math.abs(priceChange), volatilityRatio, false);
    const duration = countRegimeDuration(candles, 'weak_bear', avgAtr);
    return {
      regime: 'weak_bear',
      confidence: Math.min(confidence, 0.75),
      duration,
      allowedStrategies: STRATEGY_MAP['weak_bear'],
    };
  }

  // Default: ranging
  const duration = countRegimeDuration(candles, 'ranging', avgAtr);
  return {
    regime: 'ranging',
    confidence: adx < 20 ? 0.8 : 0.5,
    duration,
    allowedStrategies: STRATEGY_MAP['ranging'],
  };
}

function calculatePriceChange(candles: Candle[]): number {
  if (candles.length < 2) return 0;
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  return first > 0 ? ((last - first) / first) * 100 : 0;
}

function detectCrash(
  candles: Candle[],
  fearGreedValue?: number
): {
  isCrash: boolean;
  confidence: number;
  duration: number;
} {
  if (candles.length < 5) {
    return { isCrash: false, confidence: 0, duration: 0 };
  }

  const recent5 = candles.slice(-5);
  const change5 = calculatePriceChange(recent5);

  const consecutiveRed = countConsecutiveRed(candles);

  const recent10 = candles.slice(-10);
  const change10 = calculatePriceChange(recent10);

  // Brief : F&G < 10 + prix -15% en 7j = crash certain
  // 7j ~ 168 candles (1h) ou 7 candles (1d). On utilise les 7 dernières par défaut.
  const recent7 = candles.slice(-7);
  const change7d = calculatePriceChange(recent7);
  if (typeof fearGreedValue === 'number' && fearGreedValue < 10 && change7d < -15) {
    return {
      isCrash: true,
      confidence: 0.95,
      duration: 7,
    };
  }

  if (change5 < -10) {
    return {
      isCrash: true,
      confidence: Math.min(0.95, 0.6 + Math.abs(change5) * 0.02),
      duration: 5,
    };
  }

  if (change10 < -15 && consecutiveRed >= 5) {
    return {
      isCrash: true,
      confidence: Math.min(0.95, 0.5 + Math.abs(change10) * 0.015),
      duration: 10,
    };
  }

  return { isCrash: false, confidence: 0, duration: 0 };
}

/**
 * Wrapper pratique : récupère le F&G live et appelle detectRegime.
 * Utile depuis les crons.
 */
export async function detectRegimeWithLiveFearGreed(
  candles: Candle[],
  adx: number,
  ema200Position: 'above' | 'below',
  atr: number,
  avgAtr: number
): Promise<RegimeAnalysis> {
  let fgValue: number | undefined;
  try {
    const fg = await getCurrentIndex();
    fgValue = fg?.value;
  } catch {
    fgValue = undefined;
  }
  return detectRegime(candles, adx, ema200Position, atr, avgAtr, fgValue);
}

function countConsecutiveRed(candles: Candle[]): number {
  let count = 0;
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].close < candles[i].open) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function calculateTrendConfidence(
  adx: number,
  priceChangePct: number,
  volatilityRatio: number,
  isBull: boolean
): number {
  // ADX contribution (0-40 points)
  const adxScore = Math.min(40, (adx / 50) * 40);

  // Price change contribution (0-35 points)
  const changeScore = Math.min(35, priceChangePct * 3.5);

  // Volatility alignment (0-25 points)
  // Bull: moderate vol is good. Bear: high vol confirms bear.
  let volScore: number;
  if (isBull) {
    volScore = volatilityRatio < 1.5 ? 25 : Math.max(0, 25 - (volatilityRatio - 1.5) * 15);
  } else {
    volScore = volatilityRatio > 1.0 ? Math.min(25, (volatilityRatio - 1.0) * 25) : 10;
  }

  const totalScore = adxScore + changeScore + volScore;
  return parseFloat(Math.min(0.95, Math.max(0.3, totalScore / 100)).toFixed(2));
}

function countRegimeDuration(
  candles: Candle[],
  _regime: string,
  _avgAtr: number
): number {
  // Simplified: count how many consecutive candles match the current direction
  if (candles.length < 2) return 0;

  const lastClose = candles[candles.length - 1].close;
  const isBullish = lastClose > candles[Math.max(0, candles.length - 5)].close;

  let duration = 0;
  for (let i = candles.length - 1; i >= 1; i--) {
    const isUp = candles[i].close > candles[i - 1].close;
    if (isUp === isBullish) {
      duration++;
    } else {
      break;
    }
  }

  return duration;
}

/**
 * Retourne les strategies recommandees pour un regime donne.
 */
export function getAllowedStrategies(regime: MarketRegime): string[] {
  return STRATEGY_MAP[regime] ?? STRATEGY_MAP['ranging'];
}

/**
 * Verifie si une strategie est autorisee dans le regime actuel.
 */
export function isStrategyAllowed(strategy: string, regime: MarketRegime): boolean {
  const allowed = STRATEGY_MAP[regime] ?? [];
  return allowed.includes(strategy);
}
