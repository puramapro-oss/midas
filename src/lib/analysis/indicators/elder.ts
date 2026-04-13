// =============================================================================
// MIDAS — Indicateurs Elder & avancés (brief MIDAS-BRIEF-ULTIMATE.md)
// Stochastic RSI, Force Index, Elder Ray (Bull/Bear Power), Volume Profile.
// Implémentations natives JavaScript (0€, pas d'API).
// =============================================================================

import { RSI, EMA } from 'technicalindicators';
import type { Candle } from '@/lib/agents/types';

// -----------------------------------------------------------------------------
// Stochastic RSI — Stoch appliqué sur le RSI
// %K = (RSI - min(RSI, n)) / (max(RSI, n) - min(RSI, n))
// %D = SMA(%K, 3)
// -----------------------------------------------------------------------------

export interface StochRSIResult {
  k: number[];
  d: number[];
  signal: 'overbought' | 'oversold' | 'neutral';
  lastK: number;
  lastD: number;
}

export function calculateStochRSI(
  closes: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kSmooth = 3,
  dSmooth = 3,
): StochRSIResult {
  if (closes.length < rsiPeriod + stochPeriod) {
    return { k: [], d: [], signal: 'neutral', lastK: 50, lastD: 50 };
  }

  const rsi = RSI.calculate({ values: closes, period: rsiPeriod });

  // %K brut sur fenêtre glissante de stochPeriod
  const rawK: number[] = [];
  for (let i = stochPeriod - 1; i < rsi.length; i++) {
    const window = rsi.slice(i - stochPeriod + 1, i + 1);
    const min = Math.min(...window);
    const max = Math.max(...window);
    const range = max - min;
    rawK.push(range === 0 ? 50 : ((rsi[i] - min) / range) * 100);
  }

  // Lissage %K
  const k: number[] = [];
  for (let i = kSmooth - 1; i < rawK.length; i++) {
    const window = rawK.slice(i - kSmooth + 1, i + 1);
    k.push(window.reduce((a, b) => a + b, 0) / kSmooth);
  }

  // %D = SMA(%K, dSmooth)
  const d: number[] = [];
  for (let i = dSmooth - 1; i < k.length; i++) {
    const window = k.slice(i - dSmooth + 1, i + 1);
    d.push(window.reduce((a, b) => a + b, 0) / dSmooth);
  }

  const lastK = k[k.length - 1] ?? 50;
  const lastD = d[d.length - 1] ?? 50;

  let signal: StochRSIResult['signal'] = 'neutral';
  if (lastK > 80 && lastD > 80) signal = 'overbought';
  else if (lastK < 20 && lastD < 20) signal = 'oversold';

  return { k, d, signal, lastK, lastD };
}

// -----------------------------------------------------------------------------
// Force Index (Alexander Elder)
// FI = (close - close_prev) * volume
// FI(n) = EMA(FI, n)
// -----------------------------------------------------------------------------

export interface ForceIndexResult {
  values: number[];
  smoothed: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  last: number;
}

export function calculateForceIndex(candles: Candle[], emaPeriod = 13): ForceIndexResult {
  if (candles.length < emaPeriod + 2) {
    return { values: [], smoothed: [], signal: 'neutral', last: 0 };
  }

  const raw: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    raw.push((candles[i].close - candles[i - 1].close) * candles[i].volume);
  }

  const smoothed = EMA.calculate({ values: raw, period: emaPeriod });
  const last = smoothed[smoothed.length - 1] ?? 0;

  // Magnitude relative pour décider du signal
  const recentMagnitude =
    smoothed.length >= 20
      ? smoothed.slice(-20).reduce((s, v) => s + Math.abs(v), 0) / 20
      : Math.abs(last) || 1;

  let signal: ForceIndexResult['signal'] = 'neutral';
  if (last > recentMagnitude * 0.5) signal = 'bullish';
  else if (last < -recentMagnitude * 0.5) signal = 'bearish';

  return { values: raw, smoothed, signal, last };
}

// -----------------------------------------------------------------------------
// Elder Ray Index — Bull Power / Bear Power
// Bull Power = High - EMA(close, 13)
// Bear Power = Low - EMA(close, 13)
// -----------------------------------------------------------------------------

export interface ElderRayResult {
  bullPower: number[];
  bearPower: number[];
  lastBull: number;
  lastBear: number;
  signal: 'bullish' | 'bearish' | 'neutral';
}

export function calculateElderRay(candles: Candle[], emaPeriod = 13): ElderRayResult {
  if (candles.length < emaPeriod) {
    return { bullPower: [], bearPower: [], lastBull: 0, lastBear: 0, signal: 'neutral' };
  }

  const closes = candles.map((c) => c.close);
  const emaValues = EMA.calculate({ values: closes, period: emaPeriod });
  const offset = closes.length - emaValues.length;

  const bullPower: number[] = [];
  const bearPower: number[] = [];
  for (let i = 0; i < emaValues.length; i++) {
    const candleIdx = i + offset;
    bullPower.push(candles[candleIdx].high - emaValues[i]);
    bearPower.push(candles[candleIdx].low - emaValues[i]);
  }

  const lastBull = bullPower[bullPower.length - 1] ?? 0;
  const lastBear = bearPower[bearPower.length - 1] ?? 0;

  // Règle d'Elder : haussier si bull > 0 et bear < 0 (et bear remonte)
  let signal: ElderRayResult['signal'] = 'neutral';
  if (lastBull > 0 && lastBear < 0) {
    // Tendance haussière, attendre rebond du bear pour entrer
    signal = 'bullish';
  } else if (lastBear < 0 && lastBull < 0) {
    signal = 'bearish';
  }

  return { bullPower, bearPower, lastBull, lastBear, signal };
}

// -----------------------------------------------------------------------------
// Volume Profile — Distribution du volume par bucket de prix.
// POC (Point of Control) : prix avec le volume maximal
// VAH/VAL : Value Area High/Low (70% du volume autour du POC)
// -----------------------------------------------------------------------------

export interface VolumeProfileBucket {
  priceLow: number;
  priceHigh: number;
  volume: number;
}

export interface VolumeProfileResult {
  buckets: VolumeProfileBucket[];
  poc: number;
  vah: number;
  val: number;
  totalVolume: number;
  signal: 'support' | 'resistance' | 'neutral';
}

export function calculateVolumeProfile(candles: Candle[], bucketCount = 30): VolumeProfileResult {
  if (candles.length < 10) {
    return { buckets: [], poc: 0, vah: 0, val: 0, totalVolume: 0, signal: 'neutral' };
  }

  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  const range = high - low;
  if (range === 0) {
    return { buckets: [], poc: high, vah: high, val: low, totalVolume: 0, signal: 'neutral' };
  }
  const bucketSize = range / bucketCount;

  // Initialiser buckets
  const buckets: VolumeProfileBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    priceLow: low + i * bucketSize,
    priceHigh: low + (i + 1) * bucketSize,
    volume: 0,
  }));

  // Distribuer le volume de chaque bougie sur les buckets traversés
  for (const c of candles) {
    const candleRange = c.high - c.low;
    if (candleRange === 0) {
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((c.close - low) / bucketSize)));
      buckets[idx].volume += c.volume;
      continue;
    }
    const startIdx = Math.min(bucketCount - 1, Math.max(0, Math.floor((c.low - low) / bucketSize)));
    const endIdx = Math.min(bucketCount - 1, Math.max(0, Math.floor((c.high - low) / bucketSize)));
    const bucketsTouched = endIdx - startIdx + 1;
    const volPerBucket = c.volume / bucketsTouched;
    for (let i = startIdx; i <= endIdx; i++) {
      buckets[i].volume += volPerBucket;
    }
  }

  const totalVolume = buckets.reduce((s, b) => s + b.volume, 0);

  // POC
  let pocIdx = 0;
  let maxVol = 0;
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].volume > maxVol) {
      maxVol = buckets[i].volume;
      pocIdx = i;
    }
  }
  const poc = (buckets[pocIdx].priceLow + buckets[pocIdx].priceHigh) / 2;

  // Value Area : 70% du volume autour du POC, expansion alternée
  const targetVolume = totalVolume * 0.7;
  let vaVolume = buckets[pocIdx].volume;
  let upperIdx = pocIdx;
  let lowerIdx = pocIdx;
  while (vaVolume < targetVolume && (upperIdx < buckets.length - 1 || lowerIdx > 0)) {
    const upVol = upperIdx < buckets.length - 1 ? buckets[upperIdx + 1].volume : -1;
    const downVol = lowerIdx > 0 ? buckets[lowerIdx - 1].volume : -1;
    if (upVol >= downVol && upVol >= 0) {
      upperIdx += 1;
      vaVolume += upVol;
    } else if (downVol >= 0) {
      lowerIdx -= 1;
      vaVolume += downVol;
    } else {
      break;
    }
  }
  const vah = buckets[upperIdx].priceHigh;
  const val = buckets[lowerIdx].priceLow;

  // Signal : prix actuel vs VA
  const currentPrice = candles[candles.length - 1].close;
  let signal: VolumeProfileResult['signal'] = 'neutral';
  if (currentPrice <= val) signal = 'support';
  else if (currentPrice >= vah) signal = 'resistance';

  return { buckets, poc, vah, val, totalVolume, signal };
}
