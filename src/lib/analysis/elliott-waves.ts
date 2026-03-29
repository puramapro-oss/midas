// =============================================================================
// MIDAS — Elliott Wave Analysis
// Wave identification (impulse 1-5, corrective A-B-C), Fibonacci targets
// Note: Elliott Waves are inherently subjective — confidence is capped
// =============================================================================

import type { Candle } from '@/lib/agents/types';

// --- Types ---

export type WaveLabel = '1' | '2' | '3' | '4' | '5' | 'A' | 'B' | 'C' | 'unknown';
export type WaveType = 'impulse' | 'corrective' | 'unknown';

export interface WavePoint {
  index: number;
  price: number;
  label: WaveLabel;
}

export interface WaveTarget {
  label: string;
  price: number;
  ratio: string; // Fibonacci ratio used
}

export interface ElliottWaveAnalysis {
  wave_type: WaveType;
  current_wave: WaveLabel;
  wave_points: WavePoint[];
  targets: WaveTarget[];
  trend_direction: 'up' | 'down';
  confidence: number;
  signal: 'bullish' | 'bearish' | 'neutral';
}

// --- Helpers ---

interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

function findSwingPoints(candles: Candle[], lookback: number): SwingPoint[] {
  const points: SwingPoint[] = [];
  if (candles.length < lookback * 2 + 1) return points;

  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isHigh = false;
      }
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isLow = false;
      }
    }

    if (isHigh) points.push({ index: i, price: candles[i].high, type: 'high' });
    if (isLow) points.push({ index: i, price: candles[i].low, type: 'low' });
  }

  // Remove consecutive same-type points (keep the most extreme)
  const filtered: SwingPoint[] = [];
  for (const point of points) {
    const last = filtered[filtered.length - 1];
    if (last && last.type === point.type) {
      if (point.type === 'high' && point.price > last.price) {
        filtered[filtered.length - 1] = point;
      } else if (point.type === 'low' && point.price < last.price) {
        filtered[filtered.length - 1] = point;
      }
    } else {
      filtered.push(point);
    }
  }

  return filtered;
}

function validateImpulseUp(swings: SwingPoint[]): boolean {
  // Need at least 9 swing points for 5-wave impulse: low-high-low-high-low-high-low-high-low
  // Simplified: we look for 5 alternating points starting with low
  if (swings.length < 5) return false;

  // Find a valid 5-wave pattern
  // Wave 1: up, Wave 2: down (not below wave 0), Wave 3: up (above wave 1),
  // Wave 4: down (not below wave 1), Wave 5: up
  const w0 = swings[0]; // Start (low)
  const w1 = swings[1]; // Top of wave 1 (high)
  const w2 = swings[2]; // Bottom of wave 2 (low)
  const w3 = swings[3]; // Top of wave 3 (high)
  const w4 = swings[4]; // Bottom of wave 4 (low)

  if (w0.type !== 'low') return false;

  // Rule: Wave 2 cannot retrace below wave 0
  if (w2.price <= w0.price) return false;

  // Rule: Wave 3 must exceed wave 1
  if (w3.price <= w1.price) return false;

  // Rule: Wave 4 cannot overlap wave 1 territory
  if (w4.price <= w1.price) return false;

  return true;
}

function calculateTargets(
  wavePoints: WavePoint[],
  direction: 'up' | 'down'
): WaveTarget[] {
  const targets: WaveTarget[] = [];
  if (wavePoints.length < 2) return targets;

  const lastPoint = wavePoints[wavePoints.length - 1];
  const wave1Start = wavePoints[0];
  const wave1End = wavePoints.length > 1 ? wavePoints[1] : undefined;

  if (!wave1End) return targets;

  const wave1Length = Math.abs(wave1End.price - wave1Start.price);
  const fibRatios = [
    { ratio: 0.618, label: '61.8%' },
    { ratio: 1.0, label: '100%' },
    { ratio: 1.618, label: '161.8%' },
    { ratio: 2.618, label: '261.8%' },
  ];

  for (const fib of fibRatios) {
    const extension = wave1Length * fib.ratio;
    const targetPrice = direction === 'up'
      ? lastPoint.price + extension
      : lastPoint.price - extension;

    targets.push({
      label: `Wave target (${fib.label} extension)`,
      price: Math.round(targetPrice * 100) / 100,
      ratio: fib.label,
    });
  }

  return targets;
}

// --- Main Analysis ---

export function analyzeElliottWaves(candles: Candle[]): ElliottWaveAnalysis {
  if (candles.length < 50) {
    return {
      wave_type: 'unknown',
      current_wave: 'unknown',
      wave_points: [],
      targets: [],
      trend_direction: 'up',
      confidence: 0,
      signal: 'neutral',
    };
  }

  // Find swing points with different lookback periods for robustness
  const swings = findSwingPoints(candles, 5);

  if (swings.length < 5) {
    return {
      wave_type: 'unknown',
      current_wave: 'unknown',
      wave_points: [],
      targets: [],
      trend_direction: 'up',
      confidence: 0,
      signal: 'neutral',
    };
  }

  // Try to identify impulse wave pattern (upward)
  const recentSwings = swings.slice(-9);
  let waveType: WaveType = 'unknown';
  let currentWave: WaveLabel = 'unknown';
  let trendDirection: 'up' | 'down' = 'up';
  const wavePoints: WavePoint[] = [];

  // Check upward impulse
  const upSwings = recentSwings.filter((_, idx) => {
    if (idx === 0) return recentSwings[0].type === 'low';
    return true;
  });

  if (upSwings.length >= 5 && upSwings[0].type === 'low' && validateImpulseUp(upSwings)) {
    waveType = 'impulse';
    trendDirection = 'up';

    const labels: WaveLabel[] = ['1', '2', '3', '4', '5'];
    for (let i = 0; i < Math.min(5, upSwings.length); i++) {
      wavePoints.push({
        index: upSwings[i].index,
        price: upSwings[i].price,
        label: labels[i],
      });
    }

    // Determine current wave based on how many points we have
    const completedWaves = wavePoints.length;
    if (completedWaves >= 5) {
      // After wave 5, expect correction
      currentWave = 'A';
      waveType = 'corrective';
    } else if (completedWaves === 4) {
      currentWave = '5';
    } else if (completedWaves === 3) {
      currentWave = '4';
    } else if (completedWaves === 2) {
      currentWave = '3';
    } else {
      currentWave = '2';
    }
  } else {
    // Try downward impulse (invert logic)
    const downStart = recentSwings.filter((_, idx) => {
      if (idx === 0) return recentSwings[0].type === 'high';
      return true;
    });

    if (downStart.length >= 3) {
      waveType = 'corrective';
      trendDirection = 'down';

      const abcLabels: WaveLabel[] = ['A', 'B', 'C'];
      for (let i = 0; i < Math.min(3, downStart.length); i++) {
        wavePoints.push({
          index: downStart[i].index,
          price: downStart[i].price,
          label: abcLabels[i],
        });
      }

      currentWave = wavePoints.length >= 3 ? 'C' : wavePoints.length === 2 ? 'C' : 'B';
    }
  }

  // Calculate wave targets
  const targets = calculateTargets(wavePoints, trendDirection);

  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral';
  if (waveType === 'impulse' && trendDirection === 'up') {
    if (currentWave === '3' || currentWave === '5') signal = 'bullish';
    else if (currentWave === '2' || currentWave === '4') signal = 'neutral';
    else signal = 'neutral';
  } else if (waveType === 'corrective') {
    if (currentWave === 'C' && trendDirection === 'down') signal = 'bearish';
    else if (currentWave === 'C' && trendDirection === 'up') signal = 'bullish';
    else signal = 'neutral';
  } else {
    signal = 'neutral';
  }

  // Confidence is capped at 0.6 because Elliott Waves are subjective
  const confidence = waveType !== 'unknown'
    ? Math.min(0.6, 0.3 + wavePoints.length * 0.05)
    : 0;

  return {
    wave_type: waveType,
    current_wave: currentWave,
    wave_points: wavePoints,
    targets,
    trend_direction: trendDirection,
    confidence,
    signal,
  };
}
