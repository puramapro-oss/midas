// =============================================================================
// MIDAS — Volatility Indicators
// Bollinger Bands, ATR, Keltner Channels, Donchian Channels, volatility level
// =============================================================================

import { BollingerBands, ATR, EMA } from 'technicalindicators';
import type { Candle } from '@/lib/agents/types';

// --- Helpers ---

function lastValid<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

function extractArrays(candles: Candle[]) {
  return {
    close: candles.map((c) => c.close),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
  };
}

// --- Bollinger Bands ---

export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[];
}

export function calculateBollingerBands(closes: number[]): BollingerResult {
  const results = BollingerBands.calculate({
    values: closes,
    period: 20,
    stdDev: 2,
  });

  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (const r of results) {
    upper.push(r.upper);
    middle.push(r.middle);
    lower.push(r.lower);
    bandwidth.push(r.middle !== 0 ? (r.upper - r.lower) / r.middle : 0);
  }

  return { upper, middle, lower, bandwidth };
}

// --- ATR ---

export function calculateATR(candles: Candle[], period = 14): number[] {
  const { high, low, close } = extractArrays(candles);
  return ATR.calculate({ high, low, close, period });
}

// --- Keltner Channels ---

export interface KeltnerResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function calculateKeltnerChannels(candles: Candle[]): KeltnerResult {
  const closes = candles.map((c) => c.close);
  const emaPeriod = 20;
  const atrPeriod = 10;
  const atrMultiplier = 1.5;

  const emaValues = EMA.calculate({ values: closes, period: emaPeriod });
  const atrValues = calculateATR(candles, atrPeriod);

  // Align arrays: EMA starts at index emaPeriod-1, ATR at atrPeriod
  // We need to find the overlapping range
  const emaOffset = emaPeriod - 1;
  const atrOffset = atrPeriod;
  const startOffset = Math.max(emaOffset, atrOffset);

  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  const emaStart = startOffset - emaOffset;
  const atrStart = startOffset - atrOffset;
  const length = Math.min(emaValues.length - emaStart, atrValues.length - atrStart);

  for (let i = 0; i < length; i++) {
    const ema = emaValues[emaStart + i];
    const atr = atrValues[atrStart + i];
    middle.push(ema);
    upper.push(ema + atr * atrMultiplier);
    lower.push(ema - atr * atrMultiplier);
  }

  return { upper, middle, lower };
}

// --- Donchian Channels ---

export interface DonchianResult {
  upper: number[];
  lower: number[];
}

export function calculateDonchianChannels(candles: Candle[], period = 20): DonchianResult {
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    let maxHigh = -Infinity;
    let minLow = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > maxHigh) maxHigh = candles[j].high;
      if (candles[j].low < minLow) minLow = candles[j].low;
    }
    upper.push(maxHigh);
    lower.push(minLow);
  }

  return { upper, lower };
}

// --- Volatility Level ---

export type VolatilityLevel = 'low' | 'medium' | 'high' | 'extreme';

export function getVolatilityLevel(candles: Candle[]): VolatilityLevel {
  if (candles.length < 20) return 'medium';

  const atrValues = calculateATR(candles);
  const lastATR = lastValid(atrValues);
  const price = candles[candles.length - 1].close;

  if (lastATR === undefined || price === 0) return 'medium';

  const atrPercent = (lastATR / price) * 100;

  // Also check Bollinger bandwidth for squeeze detection
  const closes = candles.map((c) => c.close);
  const bb = calculateBollingerBands(closes);
  const lastBW = lastValid(bb.bandwidth) ?? 0;

  // Combine ATR% and Bollinger bandwidth
  if (atrPercent > 6 || lastBW > 0.12) return 'extreme';
  if (atrPercent > 3 || lastBW > 0.08) return 'high';
  if (atrPercent < 1 && lastBW < 0.03) return 'low';
  return 'medium';
}
