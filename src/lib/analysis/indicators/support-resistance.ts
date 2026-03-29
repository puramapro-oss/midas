// =============================================================================
// MIDAS — Support & Resistance
// Fibonacci levels, Pivot Points, dynamic support/resistance detection
// =============================================================================

import type { Candle } from '@/lib/agents/types';

// --- Fibonacci Retracement Levels ---

export interface FibonacciResult {
  levels: number[];
  labels: string[];
}

export function calculateFibonacciLevels(high: number, low: number): FibonacciResult {
  const diff = high - low;
  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const labels = ['0%', '23.6%', '38.2%', '50%', '61.8%', '78.6%', '100%'];

  const levels = ratios.map((ratio) => high - diff * ratio);

  return { levels, labels };
}

// --- Pivot Points (Classic) ---

export interface PivotPointResult {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export function calculatePivotPoints(candle: Candle): PivotPointResult {
  const { high, low, close } = candle;
  const pivot = (high + low + close) / 3;

  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
  };
}

// --- Dynamic Support/Resistance Detection ---

export interface SupportResistanceResult {
  supports: number[];
  resistances: number[];
}

export function findSupportResistance(candles: Candle[]): SupportResistanceResult {
  if (candles.length < 10) {
    return { supports: [], resistances: [] };
  }

  const currentPrice = candles[candles.length - 1].close;

  // Find swing highs and lows using a lookback window
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  const lookback = 5;

  for (let i = lookback; i < candles.length - lookback; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isSwingHigh = false;
      }
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) swingHighs.push(candles[i].high);
    if (isSwingLow) swingLows.push(candles[i].low);
  }

  // Cluster nearby levels (within 0.5% of each other)
  const clusterLevels = (levels: number[]): number[] => {
    if (levels.length === 0) return [];

    const sorted = [...levels].sort((a, b) => a - b);
    const clusters: number[][] = [[sorted[0]]];

    for (let i = 1; i < sorted.length; i++) {
      const lastCluster = clusters[clusters.length - 1];
      const clusterAvg = lastCluster.reduce((s, v) => s + v, 0) / lastCluster.length;
      const threshold = clusterAvg * 0.005; // 0.5%

      if (Math.abs(sorted[i] - clusterAvg) <= threshold) {
        lastCluster.push(sorted[i]);
      } else {
        clusters.push([sorted[i]]);
      }
    }

    // Return average of each cluster, weighted by cluster size (more touches = stronger)
    return clusters
      .filter((c) => c.length >= 2) // At least 2 touches
      .map((c) => c.reduce((s, v) => s + v, 0) / c.length)
      .sort((a, b) => a - b);
  };

  const allLevels = [...clusterLevels(swingHighs), ...clusterLevels(swingLows)];
  const uniqueLevels = clusterLevels(allLevels);

  const supports = uniqueLevels
    .filter((level) => level < currentPrice)
    .sort((a, b) => b - a) // Closest first
    .slice(0, 5);

  const resistances = uniqueLevels
    .filter((level) => level > currentPrice)
    .sort((a, b) => a - b) // Closest first
    .slice(0, 5);

  return { supports, resistances };
}
