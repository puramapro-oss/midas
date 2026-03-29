// =============================================================================
// MIDAS — Volume Indicators
// OBV, Chaikin Money Flow, VWAP, composite volume signal
// =============================================================================

import { OBV } from 'technicalindicators';
import type { Candle } from '@/lib/agents/types';

// --- Helpers ---

function lastValid<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

// --- OBV ---

export function calculateOBV(candles: Candle[]): number[] {
  const close = candles.map((c) => c.close);
  const volume = candles.map((c) => c.volume);
  return OBV.calculate({ close, volume });
}

// --- Chaikin Money Flow ---

export function calculateCMF(candles: Candle[], period = 20): number[] {
  const results: number[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    let mfvSum = 0;
    let volSum = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const c = candles[j];
      const range = c.high - c.low;
      // Money Flow Multiplier: ((close - low) - (high - close)) / (high - low)
      const mfMultiplier = range !== 0 ? ((c.close - c.low) - (c.high - c.close)) / range : 0;
      mfvSum += mfMultiplier * c.volume;
      volSum += c.volume;
    }

    results.push(volSum !== 0 ? mfvSum / volSum : 0);
  }

  return results;
}

// --- VWAP (cumulative for intraday, resets assumed per session) ---

export function calculateVWAP(candles: Candle[]): number[] {
  const results: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTPV += typicalPrice * c.volume;
    cumulativeVolume += c.volume;
    results.push(cumulativeVolume !== 0 ? cumulativeTPV / cumulativeVolume : typicalPrice);
  }

  return results;
}

// --- Composite Volume Signal ---

export interface VolumeSignalResult {
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

export function getVolumeSignal(candles: Candle[]): VolumeSignalResult {
  if (candles.length < 25) {
    return { signal: 'neutral', strength: 0 };
  }

  let bullish = 0;
  let bearish = 0;
  let total = 0;

  // OBV trend: compare last OBV to its 10-period SMA
  const obvValues = calculateOBV(candles);
  if (obvValues.length >= 10) {
    const lastOBV = obvValues[obvValues.length - 1];
    const obvSlice = obvValues.slice(-10);
    const obvSMA = obvSlice.reduce((s, v) => s + v, 0) / obvSlice.length;
    total += 2;
    if (lastOBV > obvSMA * 1.02) bullish += 2;
    else if (lastOBV < obvSMA * 0.98) bearish += 2;
  }

  // CMF direction
  const cmfValues = calculateCMF(candles);
  const lastCMF = lastValid(cmfValues);
  if (lastCMF !== undefined) {
    total += 2;
    if (lastCMF > 0.05) bullish += 2;
    else if (lastCMF > 0) bullish += 1;
    else if (lastCMF < -0.05) bearish += 2;
    else bearish += 1;
  }

  // Price vs VWAP
  const vwapValues = calculateVWAP(candles);
  const lastVWAP = lastValid(vwapValues);
  const lastPrice = candles[candles.length - 1].close;
  if (lastVWAP !== undefined) {
    total += 1;
    if (lastPrice > lastVWAP) bullish += 1;
    else bearish += 1;
  }

  // Volume trend: recent average vs longer average
  const recentVols = candles.slice(-5).map((c) => c.volume);
  const olderVols = candles.slice(-20, -5).map((c) => c.volume);
  if (recentVols.length > 0 && olderVols.length > 0) {
    const recentAvg = recentVols.reduce((s, v) => s + v, 0) / recentVols.length;
    const olderAvg = olderVols.reduce((s, v) => s + v, 0) / olderVols.length;
    const priceChange = candles[candles.length - 1].close - candles[candles.length - 6].close;

    total += 1;
    // Rising volume + rising price = bullish; rising volume + falling price = bearish
    if (recentAvg > olderAvg * 1.5) {
      if (priceChange > 0) bullish += 1;
      else bearish += 1;
    }
  }

  if (total === 0) return { signal: 'neutral', strength: 0 };

  const netScore = (bullish - bearish) / total;
  const strength = Math.min(1, Math.abs(netScore));

  let signal: 'bullish' | 'bearish' | 'neutral';
  if (netScore > 0.15) signal = 'bullish';
  else if (netScore < -0.15) signal = 'bearish';
  else signal = 'neutral';

  return { signal, strength };
}
