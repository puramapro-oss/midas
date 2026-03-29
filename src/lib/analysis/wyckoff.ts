// =============================================================================
// MIDAS — Wyckoff Analysis
// Phase detection (accumulation/markup/distribution/markdown),
// spring and upthrust events
// =============================================================================

import type { Candle } from '@/lib/agents/types';

// --- Types ---

export type WyckoffPhase =
  | 'accumulation'
  | 'markup'
  | 'distribution'
  | 'markdown'
  | 'unknown';

export interface WyckoffEvent {
  type: 'spring' | 'upthrust' | 'selling_climax' | 'buying_climax';
  index: number;
  price: number;
  confidence: number;
}

export interface WyckoffAnalysis {
  phase: WyckoffPhase;
  phase_confidence: number;
  events: WyckoffEvent[];
  volume_trend: 'increasing' | 'decreasing' | 'stable';
  price_trend: 'up' | 'down' | 'sideways';
  signal: 'bullish' | 'bearish' | 'neutral';
}

// --- Helpers ---

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function slope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// --- Event Detection ---

function detectEvents(candles: Candle[]): WyckoffEvent[] {
  const events: WyckoffEvent[] = [];
  if (candles.length < 20) return events;

  const avgVolume = average(candles.map((c) => c.volume));

  for (let i = 10; i < candles.length - 2; i++) {
    const lookback = candles.slice(Math.max(0, i - 20), i);
    const recentLow = Math.min(...lookback.map((c) => c.low));
    const recentHigh = Math.max(...lookback.map((c) => c.high));
    const current = candles[i];
    const next = candles[i + 1];
    const afterNext = candles[i + 2];

    // Spring: price dips below support then immediately reverses up
    if (
      current.low < recentLow &&
      current.close > recentLow &&
      next.close > current.close &&
      afterNext.close > next.close &&
      current.volume > avgVolume * 1.5
    ) {
      events.push({
        type: 'spring',
        index: i,
        price: current.low,
        confidence: Math.min(0.8, (next.close - current.low) / current.low * 20),
      });
    }

    // Upthrust: price pierces above resistance then reverses down
    if (
      current.high > recentHigh &&
      current.close < recentHigh &&
      next.close < current.close &&
      afterNext.close < next.close &&
      current.volume > avgVolume * 1.5
    ) {
      events.push({
        type: 'upthrust',
        index: i,
        price: current.high,
        confidence: Math.min(0.8, (current.high - next.close) / current.high * 20),
      });
    }

    // Selling climax: very high volume + long lower wick + closes near high
    const bodySize = Math.abs(current.close - current.open);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const totalRange = current.high - current.low;

    if (
      current.volume > avgVolume * 3 &&
      totalRange > 0 &&
      lowerWick / totalRange > 0.6 &&
      current.close > current.open
    ) {
      events.push({
        type: 'selling_climax',
        index: i,
        price: current.low,
        confidence: Math.min(0.7, current.volume / avgVolume * 0.15),
      });
    }

    // Buying climax: very high volume + long upper wick + closes near low
    const upperWick = current.high - Math.max(current.open, current.close);

    if (
      current.volume > avgVolume * 3 &&
      totalRange > 0 &&
      upperWick / totalRange > 0.6 &&
      current.close < current.open
    ) {
      events.push({
        type: 'buying_climax',
        index: i,
        price: current.high,
        confidence: Math.min(0.7, current.volume / avgVolume * 0.15),
      });
    }
  }

  return events.slice(-10);
}

// --- Phase Detection ---

export function detectWyckoffPhase(candles: Candle[]): WyckoffAnalysis {
  if (candles.length < 30) {
    return {
      phase: 'unknown',
      phase_confidence: 0,
      events: [],
      volume_trend: 'stable',
      price_trend: 'sideways',
      signal: 'neutral',
    };
  }

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  // Price trend analysis
  const priceSlope = slope(closes.slice(-30));
  const priceNormalized = priceSlope / average(closes.slice(-30));

  let priceTrend: 'up' | 'down' | 'sideways';
  if (priceNormalized > 0.001) priceTrend = 'up';
  else if (priceNormalized < -0.001) priceTrend = 'down';
  else priceTrend = 'sideways';

  // Volume trend
  const firstHalfVol = average(volumes.slice(-30, -15));
  const secondHalfVol = average(volumes.slice(-15));
  const volChange = firstHalfVol > 0 ? (secondHalfVol - firstHalfVol) / firstHalfVol : 0;

  let volumeTrend: 'increasing' | 'decreasing' | 'stable';
  if (volChange > 0.15) volumeTrend = 'increasing';
  else if (volChange < -0.15) volumeTrend = 'decreasing';
  else volumeTrend = 'stable';

  // Price range analysis (narrow = potential accumulation/distribution)
  const recentHighs = candles.slice(-30).map((c) => c.high);
  const recentLows = candles.slice(-30).map((c) => c.low);
  const rangeHigh = Math.max(...recentHighs);
  const rangeLow = Math.min(...recentLows);
  const rangePercent = rangeLow > 0 ? (rangeHigh - rangeLow) / rangeLow : 0;
  const isNarrowRange = rangePercent < 0.1; // Less than 10% range

  // Detect events
  const events = detectEvents(candles);
  const hasSpring = events.some((e) => e.type === 'spring');
  const hasUpthrust = events.some((e) => e.type === 'upthrust');
  const hasSellingClimax = events.some((e) => e.type === 'selling_climax');
  const hasBuyingClimax = events.some((e) => e.type === 'buying_climax');

  // Phase determination
  let phase: WyckoffPhase = 'unknown';
  let phaseConfidence = 0;

  if (isNarrowRange && volumeTrend === 'decreasing' && priceTrend === 'sideways') {
    // Sideways with declining volume = accumulation or distribution
    // Check if preceded by a downtrend (accumulation) or uptrend (distribution)
    const prevTrendCloses = candles.slice(-60, -30).map((c) => c.close);
    const prevSlope = prevTrendCloses.length > 0 ? slope(prevTrendCloses) : 0;

    if (prevSlope < 0 || hasSellingClimax || hasSpring) {
      phase = 'accumulation';
      phaseConfidence = 0.5 + (hasSpring ? 0.2 : 0) + (hasSellingClimax ? 0.1 : 0);
    } else if (prevSlope > 0 || hasBuyingClimax || hasUpthrust) {
      phase = 'distribution';
      phaseConfidence = 0.5 + (hasUpthrust ? 0.2 : 0) + (hasBuyingClimax ? 0.1 : 0);
    }
  } else if (priceTrend === 'up' && volumeTrend !== 'decreasing') {
    phase = 'markup';
    phaseConfidence = 0.5 + (volumeTrend === 'increasing' ? 0.2 : 0);
  } else if (priceTrend === 'down' && volumeTrend !== 'decreasing') {
    phase = 'markdown';
    phaseConfidence = 0.5 + (volumeTrend === 'increasing' ? 0.2 : 0);
  }

  phaseConfidence = Math.min(0.85, phaseConfidence);

  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral';
  if (phase === 'accumulation' || phase === 'markup') signal = 'bullish';
  else if (phase === 'distribution' || phase === 'markdown') signal = 'bearish';
  else signal = 'neutral';

  return {
    phase,
    phase_confidence: phaseConfidence,
    events,
    volume_trend: volumeTrend,
    price_trend: priceTrend,
    signal,
  };
}
