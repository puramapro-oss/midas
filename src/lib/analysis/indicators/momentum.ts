// =============================================================================
// MIDAS — Momentum Indicators
// RSI, MACD, Stochastic, CCI, Williams %R, MFI, composite momentum signal
// =============================================================================

import {
  RSI,
  MACD,
  Stochastic,
  CCI,
  WilliamsR,
  MFI,
} from 'technicalindicators';
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
    volume: candles.map((c) => c.volume),
  };
}

// --- RSI ---

export function calculateRSI(closes: number[], period = 14): number[] {
  return RSI.calculate({ values: closes, period });
}

// --- MACD ---

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function calculateMACD(closes: number[]): MACDResult {
  const results = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const macd: number[] = [];
  const signal: number[] = [];
  const histogram: number[] = [];

  for (const r of results) {
    if (r.MACD !== undefined && r.signal !== undefined && r.histogram !== undefined) {
      macd.push(r.MACD);
      signal.push(r.signal);
      histogram.push(r.histogram);
    }
  }

  return { macd, signal, histogram };
}

// --- Stochastic ---

export interface StochasticResult {
  k: number[];
  d: number[];
}

export function calculateStochastic(candles: Candle[]): StochasticResult {
  const { high, low, close } = extractArrays(candles);
  const results = Stochastic.calculate({
    high,
    low,
    close,
    period: 14,
    signalPeriod: 3,
  });

  const k: number[] = [];
  const d: number[] = [];

  for (const r of results) {
    if (r.k !== undefined && r.d !== undefined) {
      k.push(r.k);
      d.push(r.d);
    }
  }

  return { k, d };
}

// --- CCI ---

export function calculateCCI(candles: Candle[], period = 20): number[] {
  const { high, low, close } = extractArrays(candles);
  return CCI.calculate({ high, low, close, period });
}

// --- Williams %R ---

export function calculateWilliamsR(candles: Candle[], period = 14): number[] {
  const { high, low, close } = extractArrays(candles);
  return WilliamsR.calculate({ high, low, close, period });
}

// --- MFI ---

export function calculateMFI(candles: Candle[], period = 14): number[] {
  const { high, low, close, volume } = extractArrays(candles);
  return MFI.calculate({ high, low, close, volume, period });
}

// --- Composite Momentum Signal ---

export interface MomentumSignalResult {
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

export function getMomentumSignal(candles: Candle[]): MomentumSignalResult {
  if (candles.length < 30) {
    return { signal: 'neutral', strength: 0 };
  }

  const closes = candles.map((c) => c.close);
  let bullish = 0;
  let bearish = 0;
  let total = 0;

  // RSI
  const rsiValues = calculateRSI(closes);
  const rsi = lastValid(rsiValues);
  if (rsi !== undefined) {
    total += 2;
    if (rsi < 30) bullish += 2;
    else if (rsi < 45) bullish += 1;
    else if (rsi > 70) bearish += 2;
    else if (rsi > 55) bearish += 1;
  }

  // MACD histogram
  const macdResult = calculateMACD(closes);
  const lastHist = lastValid(macdResult.histogram);
  if (lastHist !== undefined) {
    total += 2;
    if (lastHist > 0) bullish += 2;
    else bearish += 2;
  }

  // Stochastic
  const stoch = calculateStochastic(candles);
  const lastK = lastValid(stoch.k);
  const lastD = lastValid(stoch.d);
  if (lastK !== undefined && lastD !== undefined) {
    total += 1;
    if (lastK < 20 && lastK > lastD) bullish += 1;
    else if (lastK > 80 && lastK < lastD) bearish += 1;
  }

  // CCI
  const cciValues = calculateCCI(candles);
  const lastCCI = lastValid(cciValues);
  if (lastCCI !== undefined) {
    total += 1;
    if (lastCCI < -100) bullish += 1;
    else if (lastCCI > 100) bearish += 1;
  }

  // Williams %R
  const wrValues = calculateWilliamsR(candles);
  const lastWR = lastValid(wrValues);
  if (lastWR !== undefined) {
    total += 1;
    if (lastWR < -80) bullish += 1;
    else if (lastWR > -20) bearish += 1;
  }

  // MFI
  const mfiValues = calculateMFI(candles);
  const lastMFI = lastValid(mfiValues);
  if (lastMFI !== undefined) {
    total += 1;
    if (lastMFI < 20) bullish += 1;
    else if (lastMFI > 80) bearish += 1;
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
