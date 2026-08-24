// =============================================================================
// MIDAS — Technical Scorers: Advanced Momentum Indicators
// Williams %R, MFI, StochRSI
// =============================================================================

import { WilliamsR, MFI } from 'technicalindicators';
import { lastValue } from './technical-agent-scorers-helpers';
import { WILLIAMS_PERIOD, MFI_PERIOD } from './constants/technical-config';
import { calculateStochRSI } from '@/lib/analysis/indicators/elder';
import type { IndicatorScore } from './types/technical-types';

export function scoreWilliamsR(highs: number[], lows: number[], closes: number[]): IndicatorScore {
  const values = WilliamsR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: WILLIAMS_PERIOD,
  });

  const wr = lastValue(values);

  if (wr === undefined) {
    return { name: 'williams_r', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  let signal: IndicatorScore['signal'];
  let score: number;

  if (wr < -80) {
    signal = 'bullish';
    score = 0.7;
  } else if (wr < -50) {
    signal = 'bullish';
    score = 0.2;
  } else if (wr <= -20) {
    signal = 'bearish';
    score = -0.2;
  } else {
    signal = 'bearish';
    score = -0.7;
  }

  return {
    name: 'williams_r',
    signal,
    score,
    value: wr,
    interpretation: `Williams %R ${wr.toFixed(1)} — ${wr < -80 ? 'Survendu' : wr > -20 ? 'Surachat' : 'Intermediaire'}`,
  };
}

export function scoreMFI(highs: number[], lows: number[], closes: number[], volumes: number[]): IndicatorScore {
  const values = MFI.calculate({
    high: highs,
    low: lows,
    close: closes,
    volume: volumes,
    period: MFI_PERIOD,
  });

  const mfi = lastValue(values);

  if (mfi === undefined) {
    return { name: 'mfi', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  let signal: IndicatorScore['signal'];
  let score: number;

  if (mfi < 20) {
    signal = 'bullish';
    score = 0.8;
  } else if (mfi < 40) {
    signal = 'bullish';
    score = 0.3;
  } else if (mfi <= 60) {
    signal = 'neutral';
    score = 0;
  } else if (mfi <= 80) {
    signal = 'bearish';
    score = -0.3;
  } else {
    signal = 'bearish';
    score = -0.8;
  }

  return {
    name: 'mfi',
    signal,
    score,
    value: mfi,
    interpretation: `MFI ${mfi.toFixed(1)} — ${mfi < 20 ? 'Survendu (flux sortants)' : mfi > 80 ? 'Surachat (flux entrants)' : 'Equilibre'}`,
  };
}

export function scoreStochRSI(closes: number[]): IndicatorScore {
  const result = calculateStochRSI(closes);
  let signal: IndicatorScore['signal'] = 'neutral';
  let score = 0;
  if (result.signal === 'oversold') {
    signal = 'bullish';
    score = 0.7;
  } else if (result.signal === 'overbought') {
    signal = 'bearish';
    score = -0.7;
  }
  const k = result.k;
  const d = result.d;
  if (k.length >= 2 && d.length >= 2) {
    const kPrev = k[k.length - 2];
    const dPrev = d[d.length - 2];
    if (kPrev <= dPrev && result.lastK > result.lastD && result.lastK < 50) {
      signal = 'bullish';
      score = Math.max(score, 0.5);
    } else if (kPrev >= dPrev && result.lastK < result.lastD && result.lastK > 50) {
      signal = 'bearish';
      score = Math.min(score, -0.5);
    }
  }
  return {
    name: 'stoch_rsi',
    signal,
    score,
    value: result.lastK,
    interpretation: `StochRSI K:${result.lastK.toFixed(1)} D:${result.lastD.toFixed(1)} — ${result.signal}`,
  };
}
