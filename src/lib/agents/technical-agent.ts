// =============================================================================
// MIDAS — Technical Analysis Agent
// Calcule RSI, MACD, Bollinger, EMA, SMA, Stochastic, ADX, ATR, OBV, CCI,
// Williams %R, MFI — detecte le regime de marche et retourne un AgentResult
// =============================================================================

import { EMA, ATR } from 'technicalindicators';

import type { AgentResult, Candle, MarketRegime } from '@/lib/agents/types';
import {
  ATR_PERIOD,
  INDICATOR_WEIGHTS,
  ALL_TIMEFRAMES,
  type Timeframe,
} from './constants/technical-config';
import type {
  IndicatorScore,
  TechnicalData,
  TimeframeSignal,
  MultiTimeframeTechnical,
} from './types/technical-types';
import {
  lastValue,
  scoreRSI,
  scoreMACD,
  scoreBollinger,
  scoreEMACross,
  scoreEMA200Position,
  scoreStochastic,
  scoreADX,
  scoreOBV,
  scoreCCI,
  scoreWilliamsR,
  scoreMFI,
  scoreStochRSI,
  scoreForceIndex,
  scoreElderRay,
  scoreVolumeProfile,
} from './technical-agent-scorers';

// --- Helper: extract close/high/low/volume arrays ---

function extractPrices(candles: Candle[]) {
  return {
    close: candles.map((c) => c.close),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    volume: candles.map((c) => c.volume),
  };
}

// --- Market Regime Detection ---

function detectMarketRegime(
  adxValue: number,
  atrValue: number,
  closes: number[]
): MarketRegime {
  const ema200Values = EMA.calculate({ values: closes, period: 200 });
  const ema200 = lastValue(ema200Values);
  const price = lastValue(closes);
  const atrPercent = price ? (atrValue / price) * 100 : 0;

  // Volatilite extreme
  if (atrPercent > 8) return 'crash';
  if (atrPercent > 5) return 'high_volatility';
  if (atrPercent < 0.5) return 'low_volatility';

  // Pas de tendance
  if (adxValue < 20) return 'ranging';

  // Tendance avec EMA200
  if (price !== undefined && ema200 !== undefined) {
    const aboveEma200 = price > ema200;
    if (adxValue >= 40) {
      return aboveEma200 ? 'strong_bull' : 'strong_bear';
    }
    return aboveEma200 ? 'weak_bull' : 'weak_bear';
  }

  return 'ranging';
}

// --- Main Agent Function ---

/**
 * Analyse technique complete d'une paire.
 * Necessite au minimum 200 candles pour calculer tous les indicateurs.
 */
export async function analyzeTechnical(
  pair: string,
  candles: Candle[]
): Promise<AgentResult> {
  if (candles.length < 200) {
    return {
      agent_name: 'technical',
      signal: 'neutral',
      score: 0,
      confidence: 0,
      reasoning: `Donnees insuffisantes: ${candles.length} candles fournies, minimum 200 requises`,
      data: { error: 'insufficient_data', candle_count: candles.length },
      timestamp: new Date(),
    };
  }

  const { close, high, low, volume } = extractPrices(candles);

  // Calcul de tous les indicateurs (15 indicateurs)
  const indicators: IndicatorScore[] = [
    scoreRSI(close),
    scoreMACD(close),
    scoreBollinger(close),
    scoreEMACross(close),
    scoreEMA200Position(close),
    scoreStochastic(high, low, close),
    scoreADX(high, low, close),
    scoreOBV(close, volume),
    scoreCCI(high, low, close),
    scoreWilliamsR(high, low, close),
    scoreMFI(high, low, close, volume),
    // 4 indicateurs ajoutés (brief)
    scoreStochRSI(close),
    scoreForceIndex(candles),
    scoreElderRay(candles),
    scoreVolumeProfile(candles),
  ];

  // ATR pour position sizing et regime
  const atrValues = ATR.calculate({ high, low, close, period: ATR_PERIOD });
  const atrValue = lastValue(atrValues) ?? 0;

  // ADX pour regime
  const adxIndicator = indicators.find((i) => i.name === 'adx');
  const adxValue = typeof adxIndicator?.value === 'number' ? adxIndicator.value : 0;

  // Regime de marche
  const regime = detectMarketRegime(adxValue, atrValue, close);

  // Score composite pondere
  let weightedScore = 0;
  let totalWeight = 0;

  for (const indicator of indicators) {
    const weight = INDICATOR_WEIGHTS[indicator.name] ?? 0.05;
    weightedScore += indicator.score * weight;
    totalWeight += weight;
  }

  const compositeScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  // Confidence basee sur l'alignement des indicateurs
  const bullishCount = indicators.filter((i) => i.signal === 'bullish').length;
  const bearishCount = indicators.filter((i) => i.signal === 'bearish').length;
  const totalIndicators = indicators.length;
  const alignment = Math.max(bullishCount, bearishCount) / totalIndicators;
  const confidence = Math.min(0.95, alignment * (adxValue > 25 ? 1.2 : 0.8));

  // Signal final
  let signal: AgentResult['signal'];
  if (compositeScore > 0.15) {
    signal = 'bullish';
  } else if (compositeScore < -0.15) {
    signal = 'bearish';
  } else {
    signal = 'neutral';
  }

  // Reasoning
  const topBullish = indicators
    .filter((i) => i.signal === 'bullish')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const topBearish = indicators
    .filter((i) => i.signal === 'bearish')
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const currentPrice = lastValue(close) ?? 0;
  const ema200 = lastValue(EMA.calculate({ values: close, period: 200 })) ?? null;

  const reasoning = [
    `Analyse technique ${pair} — Regime: ${regime}`,
    `Score composite: ${compositeScore.toFixed(3)} | Signal: ${signal.toUpperCase()}`,
    `Indicateurs haussiers (${bullishCount}): ${topBullish.map((i) => i.interpretation).join('; ')}`,
    `Indicateurs baissiers (${bearishCount}): ${topBearish.map((i) => i.interpretation).join('; ')}`,
    `ATR: ${atrValue.toFixed(4)} | ADX: ${adxValue.toFixed(1)} | RSI: ${(indicators.find((i) => i.name === 'rsi')?.value ?? 'N/A')}`,
  ].join('\n');

  const technicalData: TechnicalData = {
    indicators,
    regime,
    atr_value: atrValue,
    adx_value: adxValue,
    rsi_value: typeof indicators.find((i) => i.name === 'rsi')?.value === 'number'
      ? indicators.find((i) => i.name === 'rsi')!.value as number
      : 0,
    current_price: currentPrice,
    ema_200: ema200,
  };

  return {
    agent_name: 'technical',
    signal,
    score: compositeScore,
    confidence,
    reasoning,
    data: technicalData as unknown as Record<string, unknown>,
    timestamp: new Date(),
  };
}

// =============================================================================
// MULTI-TIMEFRAME ANALYSIS — brief MIDAS-BRIEF-ULTIMATE.md
// "analyse sur 1m, 5m, 15m, 1h, 4h, 1d simultanément. Signal valide UNIQUEMENT
//  si 3+ timeframes sont alignés."
// =============================================================================

import { fetchKlines } from '@/lib/exchange/binance-public';
import type { MultiTimeframeResult } from '@/lib/agents/types';

/**
 * Lance analyzeTechnical sur les 6 timeframes en parallèle et renvoie
 * un agrégat avec alignement.
 */
export async function analyzeTechnicalMultiTimeframe(pair: string): Promise<MultiTimeframeTechnical> {
  const fetches = ALL_TIMEFRAMES.map(async (tf) => {
    try {
      const candles = await fetchKlines(pair, tf, 250);
      if (candles.length < 200) {
        return { timeframe: tf, signal: 'neutral' as const, score: 0, confidence: 0 };
      }
      const result = await analyzeTechnical(pair, candles);
      return {
        timeframe: tf,
        signal: result.signal,
        score: result.score,
        confidence: result.confidence,
      };
    } catch {
      return { timeframe: tf, signal: 'neutral' as const, score: 0, confidence: 0 };
    }
  });

  const per_tf = await Promise.all(fetches);

  const bullish_count = per_tf.filter((t) => t.signal === 'bullish').length;
  const bearish_count = per_tf.filter((t) => t.signal === 'bearish').length;

  // Brief : signal valide si ≥3 TF alignés
  const aligned_3plus = bullish_count >= 3 || bearish_count >= 3;

  let composite_signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (aligned_3plus) {
    composite_signal = bullish_count > bearish_count ? 'bullish' : 'bearish';
  }

  // Score composite pondéré : higher TF = higher weight
  const tfWeights: Record<Timeframe, number> = {
    '1m': 0.05,
    '5m': 0.10,
    '15m': 0.15,
    '1h': 0.20,
    '4h': 0.25,
    '1d': 0.25,
  };
  let weightedScore = 0;
  let totalWeight = 0;
  for (const t of per_tf) {
    const w = tfWeights[t.timeframe];
    weightedScore += t.score * w;
    totalWeight += w;
  }
  const composite_score = totalWeight > 0 ? weightedScore / totalWeight : 0;

  // Alignment au format MultiTimeframeResult (macro/meso/micro)
  const macro = per_tf.find((t) => t.timeframe === '1d') ?? per_tf[per_tf.length - 1];
  const meso = per_tf.find((t) => t.timeframe === '1h') ?? per_tf[Math.floor(per_tf.length / 2)];
  const micro = per_tf.find((t) => t.timeframe === '5m') ?? per_tf[0];

  const alignment: MultiTimeframeResult = {
    macro: { timeframe: macro.timeframe, trend: macro.signal },
    meso: { timeframe: meso.timeframe, trend: meso.signal },
    micro: { timeframe: micro.timeframe, trend: micro.signal },
    aligned: macro.signal === meso.signal && meso.signal === micro.signal && macro.signal !== 'neutral',
  };

  return {
    per_tf,
    alignment,
    bullish_count,
    bearish_count,
    aligned_3plus,
    composite_signal,
    composite_score,
  };
}
