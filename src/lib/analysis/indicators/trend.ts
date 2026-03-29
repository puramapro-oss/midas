// =============================================================================
// MIDAS — Trend Indicators
// EMA, SMA, ADX, Ichimoku, Parabolic SAR, composite trend signal
// =============================================================================

import { EMA, SMA, ADX, PSAR } from 'technicalindicators';
import type { Candle } from '@/lib/agents/types';

// --- Simple helpers ---

function lastValid<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

function extractArrays(candles: Candle[]) {
  return {
    close: candles.map((c) => c.close),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    volume: candles.map((c) => c.volume),
  };
}

// --- EMA ---

export function calculateEMA(closes: number[], period: number): number[] {
  return EMA.calculate({ values: closes, period });
}

// --- SMA ---

export function calculateSMA(closes: number[], period: number): number[] {
  return SMA.calculate({ values: closes, period });
}

// --- ADX with +DI / -DI ---

export function calculateADX(
  candles: Candle[],
  period = 14
): { adx: number[]; pdi: number[]; mdi: number[] } {
  const { high, low, close } = extractArrays(candles);
  const results = ADX.calculate({ high, low, close, period });

  return {
    adx: results.map((r) => r.adx),
    pdi: results.map((r) => r.pdi),
    mdi: results.map((r) => r.mdi),
  };
}

// --- Ichimoku Cloud ---

export function calculateIchimoku(
  candles: Candle[]
): { tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[] } {
  const tenkanPeriod = 9;
  const kijunPeriod = 26;
  const senkouBPeriod = 52;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  function midpoint(h: number[], l: number[], period: number, index: number): number | null {
    if (index < period - 1) return null;
    let maxH = -Infinity;
    let minL = Infinity;
    for (let i = index - period + 1; i <= index; i++) {
      if (h[i] > maxH) maxH = h[i];
      if (l[i] < minL) minL = l[i];
    }
    return (maxH + minL) / 2;
  }

  const tenkan: number[] = [];
  const kijun: number[] = [];
  const senkouA: number[] = [];
  const senkouB: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const t = midpoint(highs, lows, tenkanPeriod, i);
    const k = midpoint(highs, lows, kijunPeriod, i);
    const sb = midpoint(highs, lows, senkouBPeriod, i);

    if (t !== null) tenkan.push(t);
    if (k !== null) kijun.push(k);
    if (t !== null && k !== null) senkouA.push((t + k) / 2);
    if (sb !== null) senkouB.push(sb);
  }

  return { tenkan, kijun, senkouA, senkouB };
}

// --- Parabolic SAR ---

export function calculateParabolicSAR(candles: Candle[]): number[] {
  const { high, low } = extractArrays(candles);
  return PSAR.calculate({
    high,
    low,
    step: 0.02,
    max: 0.2,
  });
}

// --- Composite Trend Signal ---

export interface TrendSignalResult {
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

export function getTrendSignal(candles: Candle[]): TrendSignalResult {
  if (candles.length < 52) {
    return { signal: 'neutral', strength: 0 };
  }

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  let bullish = 0;
  let bearish = 0;
  let total = 0;

  // EMA alignment (9 > 21 > 50)
  const ema9 = lastValid(calculateEMA(closes, 9));
  const ema21 = lastValid(calculateEMA(closes, 21));
  const ema50 = lastValid(calculateEMA(closes, 50));

  if (ema9 !== undefined && ema21 !== undefined && ema50 !== undefined) {
    total += 3;
    if (ema9 > ema21 && ema21 > ema50) bullish += 3;
    else if (ema9 < ema21 && ema21 < ema50) bearish += 3;
    else if (ema9 > ema21) bullish += 1;
    else bearish += 1;
  }

  // ADX direction
  const adxResult = calculateADX(candles);
  const lastADX = lastValid(adxResult.adx);
  const lastPDI = lastValid(adxResult.pdi);
  const lastMDI = lastValid(adxResult.mdi);

  if (lastADX !== undefined && lastPDI !== undefined && lastMDI !== undefined && lastADX > 20) {
    total += 2;
    if (lastPDI > lastMDI) bullish += 2;
    else bearish += 2;
  } else {
    total += 1;
  }

  // Price vs SAR
  const sar = calculateParabolicSAR(candles);
  const lastSAR = lastValid(sar);

  if (lastSAR !== undefined) {
    total += 1;
    if (price > lastSAR) bullish += 1;
    else bearish += 1;
  }

  // Ichimoku cloud
  const ichimoku = calculateIchimoku(candles);
  const lastSA = lastValid(ichimoku.senkouA);
  const lastSB = lastValid(ichimoku.senkouB);

  if (lastSA !== undefined && lastSB !== undefined) {
    const cloudTop = Math.max(lastSA, lastSB);
    const cloudBottom = Math.min(lastSA, lastSB);
    total += 2;
    if (price > cloudTop) bullish += 2;
    else if (price < cloudBottom) bearish += 2;
    else {
      bullish += 0.5;
      bearish += 0.5;
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
