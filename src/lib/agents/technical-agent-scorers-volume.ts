// =============================================================================
// MIDAS — Technical Scorers: Volume & Elder Indicators
// OBV, Force Index, Elder Ray, Volume Profile
// =============================================================================

import { OBV } from 'technicalindicators';
import type { Candle } from '@/lib/agents/types';
import { calculateForceIndex, calculateElderRay, calculateVolumeProfile } from '@/lib/analysis/indicators/elder';
import type { IndicatorScore } from './types/technical-types';

export function scoreOBV(closes: number[], volumes: number[]): IndicatorScore {
  const values = OBV.calculate({ close: closes, volume: volumes });

  if (values.length < 10) {
    return { name: 'obv', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  const current = values[values.length - 1];
  const recent = values.slice(-10);
  const smaOBV = recent.reduce((sum, v) => sum + v, 0) / recent.length;

  let signal: IndicatorScore['signal'];
  let score: number;
  const trend = current > smaOBV ? 'haussiere' : 'baissiere';

  if (current > smaOBV * 1.05) {
    signal = 'bullish';
    score = 0.6;
  } else if (current > smaOBV) {
    signal = 'bullish';
    score = 0.3;
  } else if (current > smaOBV * 0.95) {
    signal = 'bearish';
    score = -0.3;
  } else {
    signal = 'bearish';
    score = -0.6;
  }

  return {
    name: 'obv',
    signal,
    score,
    value: current,
    interpretation: `OBV tendance ${trend} (OBV: ${current.toFixed(0)}, SMA10: ${smaOBV.toFixed(0)})`,
  };
}

export function scoreForceIndex(candles: Candle[]): IndicatorScore {
  const result = calculateForceIndex(candles);
  let signal: IndicatorScore['signal'] = 'neutral';
  let score = 0;
  if (result.signal === 'bullish') {
    signal = 'bullish';
    score = 0.6;
  } else if (result.signal === 'bearish') {
    signal = 'bearish';
    score = -0.6;
  }
  return {
    name: 'force_index',
    signal,
    score,
    value: result.last,
    interpretation: `Force Index ${result.last.toExponential(2)} — ${result.signal === 'bullish' ? 'pression acheteuse' : result.signal === 'bearish' ? 'pression vendeuse' : 'neutre'}`,
  };
}

export function scoreElderRay(candles: Candle[]): IndicatorScore {
  const result = calculateElderRay(candles);
  let signal: IndicatorScore['signal'] = 'neutral';
  let score = 0;
  if (result.lastBull > 0 && result.lastBear < 0) {
    const bearPrev = result.bearPower[result.bearPower.length - 2] ?? result.lastBear;
    if (result.lastBear > bearPrev) {
      signal = 'bullish';
      score = 0.8;
    } else {
      signal = 'bullish';
      score = 0.4;
    }
  } else if (result.lastBull < 0 && result.lastBear < 0) {
    signal = 'bearish';
    score = -0.7;
  }
  return {
    name: 'elder_ray',
    signal,
    score,
    value: result.lastBull,
    interpretation: `Elder Ray Bull:${result.lastBull.toFixed(2)} Bear:${result.lastBear.toFixed(2)}`,
  };
}

export function scoreVolumeProfile(candles: Candle[]): IndicatorScore {
  const result = calculateVolumeProfile(candles);
  let signal: IndicatorScore['signal'] = 'neutral';
  let score = 0;
  if (result.signal === 'support') {
    signal = 'bullish';
    score = 0.5;
  } else if (result.signal === 'resistance') {
    signal = 'bearish';
    score = -0.5;
  }
  return {
    name: 'volume_profile',
    signal,
    score,
    value: result.poc,
    interpretation: `VP POC:${result.poc.toFixed(2)} VAH:${result.vah.toFixed(2)} VAL:${result.val.toFixed(2)} — ${result.signal}`,
  };
}
