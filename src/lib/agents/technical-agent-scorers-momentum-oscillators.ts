// =============================================================================
// MIDAS — Technical Scorers: Core Momentum Oscillators
// RSI, MACD, Stochastic, CCI
// =============================================================================

import { RSI, MACD, Stochastic, CCI } from 'technicalindicators';
import { lastValue, secondToLast } from './technical-agent-scorers-helpers';
import {
  RSI_PERIOD,
  MACD_FAST,
  MACD_SLOW,
  MACD_SIGNAL,
  STOCH_PERIOD,
  STOCH_SIGNAL,
  CCI_PERIOD,
} from './constants/technical-config';
import type { IndicatorScore } from './types/technical-types';

export function scoreRSI(closes: number[]): IndicatorScore {
  const values = RSI.calculate({ values: closes, period: RSI_PERIOD });
  const rsi = lastValue(values);

  if (rsi === undefined) {
    return { name: 'rsi', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  let signal: IndicatorScore['signal'] = 'neutral';
  let score = 0;
  let interpretation = '';

  if (rsi < 20) {
    signal = 'bullish';
    score = 0.9;
    interpretation = `RSI ${rsi.toFixed(1)} — Survendu extreme, rebond probable`;
  } else if (rsi < 30) {
    signal = 'bullish';
    score = 0.7;
    interpretation = `RSI ${rsi.toFixed(1)} — Survendu, potentiel retournement haussier`;
  } else if (rsi < 45) {
    signal = 'bullish';
    score = 0.3;
    interpretation = `RSI ${rsi.toFixed(1)} — Zone basse, legerement haussier`;
  } else if (rsi <= 55) {
    signal = 'neutral';
    score = 0;
    interpretation = `RSI ${rsi.toFixed(1)} — Zone neutre`;
  } else if (rsi <= 70) {
    signal = 'bearish';
    score = -0.3;
    interpretation = `RSI ${rsi.toFixed(1)} — Zone haute, legerement baissier`;
  } else if (rsi <= 80) {
    signal = 'bearish';
    score = -0.7;
    interpretation = `RSI ${rsi.toFixed(1)} — Surachat, potentiel retournement baissier`;
  } else {
    signal = 'bearish';
    score = -0.9;
    interpretation = `RSI ${rsi.toFixed(1)} — Surachat extreme, correction probable`;
  }

  return { name: 'rsi', signal, score, value: rsi, interpretation };
}

export function scoreMACD(closes: number[]): IndicatorScore {
  const values = MACD.calculate({
    values: closes,
    fastPeriod: MACD_FAST,
    slowPeriod: MACD_SLOW,
    signalPeriod: MACD_SIGNAL,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const current = lastValue(values);
  const previous = secondToLast(values);

  if (!current || current.MACD === undefined || current.signal === undefined || current.histogram === undefined) {
    return { name: 'macd', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  const histogram = current.histogram;
  const prevHistogram = previous?.histogram;

  let signal: IndicatorScore['signal'] = 'neutral';
  let score = 0;
  let interpretation = '';

  if (prevHistogram !== undefined && prevHistogram < 0 && histogram > 0) {
    signal = 'bullish';
    score = 0.8;
    interpretation = `MACD croisement haussier, histogram ${histogram.toFixed(4)}`;
  } else if (prevHistogram !== undefined && prevHistogram > 0 && histogram < 0) {
    signal = 'bearish';
    score = -0.8;
    interpretation = `MACD croisement baissier, histogram ${histogram.toFixed(4)}`;
  } else if (histogram > 0) {
    const momentum = prevHistogram !== undefined ? histogram - prevHistogram : 0;
    score = momentum > 0 ? 0.5 : 0.2;
    signal = 'bullish';
    interpretation = `MACD positif ${momentum > 0 ? 'en acceleration' : 'en deceleration'}`;
  } else if (histogram < 0) {
    const momentum = prevHistogram !== undefined ? histogram - prevHistogram : 0;
    score = momentum < 0 ? -0.5 : -0.2;
    signal = 'bearish';
    interpretation = `MACD negatif ${momentum < 0 ? 'en acceleration' : 'en deceleration'}`;
  } else {
    interpretation = 'MACD neutre';
  }

  return { name: 'macd', signal, score, value: histogram, interpretation };
}

export function scoreStochastic(highs: number[], lows: number[], closes: number[]): IndicatorScore {
  const values = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: STOCH_PERIOD,
    signalPeriod: STOCH_SIGNAL,
  });

  const current = lastValue(values);

  if (!current || current.k === undefined || current.d === undefined) {
    return { name: 'stochastic', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  const { k, d } = current;
  let signal: IndicatorScore['signal'] = 'neutral';
  let score = 0;
  let interpretation = '';

  if (k < 20 && d < 20) {
    signal = 'bullish';
    score = k > d ? 0.8 : 0.5;
    interpretation = `Stochastic survendu (K:${k.toFixed(1)} D:${d.toFixed(1)})${k > d ? ' avec croisement haussier' : ''}`;
  } else if (k > 80 && d > 80) {
    signal = 'bearish';
    score = k < d ? -0.8 : -0.5;
    interpretation = `Stochastic surachat (K:${k.toFixed(1)} D:${d.toFixed(1)})${k < d ? ' avec croisement baissier' : ''}`;
  } else {
    score = k > d ? 0.2 : -0.2;
    signal = score > 0 ? 'bullish' : 'bearish';
    interpretation = `Stochastic neutre (K:${k.toFixed(1)} D:${d.toFixed(1)})`;
  }

  return { name: 'stochastic', signal, score, value: `K:${k.toFixed(1)} D:${d.toFixed(1)}`, interpretation };
}

export function scoreCCI(highs: number[], lows: number[], closes: number[]): IndicatorScore {
  const values = CCI.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: CCI_PERIOD,
  });

  const cci = lastValue(values);

  if (cci === undefined) {
    return { name: 'cci', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  let signal: IndicatorScore['signal'];
  let score: number;

  if (cci < -200) {
    signal = 'bullish';
    score = 0.8;
  } else if (cci < -100) {
    signal = 'bullish';
    score = 0.5;
  } else if (cci <= 100) {
    signal = 'neutral';
    score = 0;
  } else if (cci <= 200) {
    signal = 'bearish';
    score = -0.5;
  } else {
    signal = 'bearish';
    score = -0.8;
  }

  return {
    name: 'cci',
    signal,
    score,
    value: cci,
    interpretation: `CCI ${cci.toFixed(1)} — ${cci < -100 ? 'Survendu' : cci > 100 ? 'Surachat' : 'Neutre'}`,
  };
}
