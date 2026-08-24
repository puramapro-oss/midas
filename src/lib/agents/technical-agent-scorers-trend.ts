// =============================================================================
// MIDAS — Technical Scorers: Trend Indicators
// Bollinger Bands, EMA Cross, EMA 200 Position, ADX
// =============================================================================

import { BollingerBands, EMA, ADX } from 'technicalindicators';
import { lastValue } from './technical-agent-scorers-helpers';
import { BB_PERIOD, BB_STD_DEV, EMA_PERIODS, ADX_PERIOD } from './constants/technical-config';
import type { IndicatorScore } from './types/technical-types';

export function scoreBollinger(closes: number[]): IndicatorScore {
  const values = BollingerBands.calculate({
    values: closes,
    period: BB_PERIOD,
    stdDev: BB_STD_DEV,
  });

  const current = lastValue(values);
  const price = lastValue(closes);

  if (!current || price === undefined) {
    return { name: 'bollinger', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  const { upper, lower, middle } = current;
  const bandWidth = (upper - lower) / middle;
  const percentB = (price - lower) / (upper - lower);

  let signal: IndicatorScore['signal'] = 'neutral';
  let score = 0;
  let interpretation = '';

  if (percentB <= 0) {
    signal = 'bullish';
    score = 0.8;
    interpretation = `Prix sous bande inferieure (%B: ${percentB.toFixed(2)}) — survendu`;
  } else if (percentB < 0.2) {
    signal = 'bullish';
    score = 0.5;
    interpretation = `Prix pres bande inferieure (%B: ${percentB.toFixed(2)})`;
  } else if (percentB <= 0.8) {
    signal = 'neutral';
    score = 0;
    interpretation = `Prix dans les bandes (%B: ${percentB.toFixed(2)}, width: ${bandWidth.toFixed(4)})`;
  } else if (percentB < 1) {
    signal = 'bearish';
    score = -0.5;
    interpretation = `Prix pres bande superieure (%B: ${percentB.toFixed(2)})`;
  } else {
    signal = 'bearish';
    score = -0.8;
    interpretation = `Prix au-dessus bande superieure (%B: ${percentB.toFixed(2)}) — surachat`;
  }

  return { name: 'bollinger', signal, score, value: `%B: ${percentB.toFixed(3)}`, interpretation };
}

export function scoreEMACross(closes: number[]): IndicatorScore {
  const ema9 = lastValue(EMA.calculate({ values: closes, period: EMA_PERIODS[0] }));
  const ema21 = lastValue(EMA.calculate({ values: closes, period: EMA_PERIODS[1] }));
  const ema50 = lastValue(EMA.calculate({ values: closes, period: EMA_PERIODS[2] }));

  if (ema9 === undefined || ema21 === undefined || ema50 === undefined) {
    return { name: 'ema_cross', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  let bullishPoints = 0;
  let bearishPoints = 0;

  if (ema9 > ema21) bullishPoints += 2;
  else bearishPoints += 2;

  if (ema21 > ema50) bullishPoints += 1;
  else bearishPoints += 1;

  const price = lastValue(closes);
  if (price !== undefined) {
    if (price > ema9) bullishPoints += 1;
    else bearishPoints += 1;
  }

  const totalPoints = bullishPoints + bearishPoints;
  const normalizedScore = (bullishPoints - bearishPoints) / totalPoints;

  const signal: IndicatorScore['signal'] =
    normalizedScore > 0.2 ? 'bullish' : normalizedScore < -0.2 ? 'bearish' : 'neutral';

  return {
    name: 'ema_cross',
    signal,
    score: normalizedScore,
    value: `EMA9:${ema9.toFixed(2)} EMA21:${ema21.toFixed(2)} EMA50:${ema50.toFixed(2)}`,
    interpretation: `EMAs ${signal === 'bullish' ? 'alignees haussier' : signal === 'bearish' ? 'alignees baissier' : 'mixtes'}`,
  };
}

export function scoreEMA200Position(closes: number[]): IndicatorScore {
  const ema200Values = EMA.calculate({ values: closes, period: EMA_PERIODS[3] });
  const ema200 = lastValue(ema200Values);
  const price = lastValue(closes);

  if (ema200 === undefined || price === undefined) {
    return { name: 'ema_200_position', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  const distancePercent = ((price - ema200) / ema200) * 100;

  let signal: IndicatorScore['signal'];
  let score: number;

  if (distancePercent > 5) {
    signal = 'bullish';
    score = 0.6;
  } else if (distancePercent > 0) {
    signal = 'bullish';
    score = 0.3;
  } else if (distancePercent > -5) {
    signal = 'bearish';
    score = -0.3;
  } else {
    signal = 'bearish';
    score = -0.6;
  }

  return {
    name: 'ema_200_position',
    signal,
    score,
    value: ema200,
    interpretation: `Prix ${distancePercent > 0 ? 'au-dessus' : 'en-dessous'} EMA200 (${distancePercent.toFixed(1)}%)`,
  };
}

export function scoreADX(highs: number[], lows: number[], closes: number[]): IndicatorScore {
  const values = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: ADX_PERIOD,
  });

  const current = lastValue(values);

  if (!current || current.adx === undefined) {
    return { name: 'adx', signal: 'neutral', score: 0, value: 0, interpretation: 'Donnees insuffisantes' };
  }

  const adx = current.adx;
  const pdi = current.pdi;
  const mdi = current.mdi;

  let signal: IndicatorScore['signal'] = 'neutral';
  let score = 0;
  let interpretation = '';

  if (adx < 20) {
    signal = 'neutral';
    score = 0;
    interpretation = `ADX ${adx.toFixed(1)} — Pas de tendance`;
  } else if (adx < 40) {
    if (pdi > mdi) {
      signal = 'bullish';
      score = 0.5;
      interpretation = `ADX ${adx.toFixed(1)} — Tendance haussiere moderee (+DI: ${pdi.toFixed(1)} > -DI: ${mdi.toFixed(1)})`;
    } else {
      signal = 'bearish';
      score = -0.5;
      interpretation = `ADX ${adx.toFixed(1)} — Tendance baissiere moderee (-DI: ${mdi.toFixed(1)} > +DI: ${pdi.toFixed(1)})`;
    }
  } else {
    if (pdi > mdi) {
      signal = 'bullish';
      score = 0.8;
      interpretation = `ADX ${adx.toFixed(1)} — Forte tendance haussiere (+DI: ${pdi.toFixed(1)} > -DI: ${mdi.toFixed(1)})`;
    } else {
      signal = 'bearish';
      score = -0.8;
      interpretation = `ADX ${adx.toFixed(1)} — Forte tendance baissiere (-DI: ${mdi.toFixed(1)} > +DI: ${pdi.toFixed(1)})`;
    }
  }

  return { name: 'adx', signal, score, value: adx, interpretation };
}
