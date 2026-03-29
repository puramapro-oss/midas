// =============================================================================
// MIDAS — Technical Analysis Agent
// Calcule RSI, MACD, Bollinger, EMA, SMA, Stochastic, ADX, ATR, OBV, CCI,
// Williams %R, MFI — detecte le regime de marche et retourne un AgentResult
// =============================================================================

import {
  RSI,
  MACD,
  BollingerBands,
  EMA,
  Stochastic,
  ADX,
  ATR,
  OBV,
  CCI,
  WilliamsR,
  MFI,
} from 'technicalindicators';

import type { AgentResult, Candle, MarketRegime } from '@/lib/agents/types';

// --- Indicator Configuration ---

const RSI_PERIOD = 14;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;
const BB_PERIOD = 20;
const BB_STD_DEV = 2;
const EMA_PERIODS = [9, 21, 50, 200] as const;
const STOCH_PERIOD = 14;
const STOCH_SIGNAL = 3;
const ADX_PERIOD = 14;
const ATR_PERIOD = 14;
const CCI_PERIOD = 20;
const WILLIAMS_PERIOD = 14;
const MFI_PERIOD = 14;

// --- Indicator Weights for Composite Score ---

const INDICATOR_WEIGHTS: Record<string, number> = {
  rsi: 0.12,
  macd: 0.15,
  bollinger: 0.10,
  ema_cross: 0.13,
  stochastic: 0.08,
  adx: 0.10,
  obv: 0.08,
  cci: 0.06,
  williams_r: 0.06,
  mfi: 0.07,
  ema_200_position: 0.05,
};

// --- Types ---

interface IndicatorScore {
  name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  score: number;
  value: number | string;
  interpretation: string;
}

interface TechnicalData {
  indicators: IndicatorScore[];
  regime: MarketRegime;
  atr_value: number;
  adx_value: number;
  rsi_value: number;
  current_price: number;
  ema_200: number | null;
}

// --- Helper: extract close/high/low/volume arrays ---

function extractPrices(candles: Candle[]) {
  return {
    close: candles.map((c) => c.close),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    volume: candles.map((c) => c.volume),
  };
}

function lastValue<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

function secondToLast<T>(arr: T[]): T | undefined {
  return arr.length > 1 ? arr[arr.length - 2] : undefined;
}

// --- Individual Indicator Scorers ---

function scoreRSI(closes: number[]): IndicatorScore {
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

function scoreMACD(closes: number[]): IndicatorScore {
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

  // Croisement haussier (histogram passe de negatif a positif)
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

function scoreBollinger(closes: number[]): IndicatorScore {
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

function scoreEMACross(closes: number[]): IndicatorScore {
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

function scoreEMA200Position(closes: number[]): IndicatorScore {
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

function scoreStochastic(highs: number[], lows: number[], closes: number[]): IndicatorScore {
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

function scoreADX(highs: number[], lows: number[], closes: number[]): IndicatorScore {
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

function scoreOBV(closes: number[], volumes: number[]): IndicatorScore {
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

function scoreCCI(highs: number[], lows: number[], closes: number[]): IndicatorScore {
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

function scoreWilliamsR(highs: number[], lows: number[], closes: number[]): IndicatorScore {
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

function scoreMFI(highs: number[], lows: number[], closes: number[], volumes: number[]): IndicatorScore {
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

// --- Market Regime Detection ---

function detectMarketRegime(
  adxValue: number,
  atrValue: number,
  closes: number[]
): MarketRegime {
  const ema200Values = EMA.calculate({ values: closes, period: 200 });
  const ema200 = lastValue(ema200Values);
  const price = lastValue(closes);
  const atrPercent = price ? (atrValue / price) * 100 : 0;

  // Volatilite extreme
  if (atrPercent > 8) return 'crash';
  if (atrPercent > 5) return 'high_volatility';
  if (atrPercent < 0.5) return 'low_volatility';

  // Pas de tendance
  if (adxValue < 20) return 'ranging';

  // Tendance avec EMA200
  if (price !== undefined && ema200 !== undefined) {
    const aboveEma200 = price > ema200;
    if (adxValue >= 40) {
      return aboveEma200 ? 'strong_bull' : 'strong_bear';
    }
    return aboveEma200 ? 'weak_bull' : 'weak_bear';
  }

  return 'ranging';
}

// --- Main Agent Function ---

/**
 * Analyse technique complete d'une paire.
 * Necessite au minimum 200 candles pour calculer tous les indicateurs.
 */
export async function analyzeTechnical(
  pair: string,
  candles: Candle[]
): Promise<AgentResult> {
  if (candles.length < 200) {
    return {
      agent_name: 'technical',
      signal: 'neutral',
      score: 0,
      confidence: 0,
      reasoning: `Donnees insuffisantes: ${candles.length} candles fournies, minimum 200 requises`,
      data: { error: 'insufficient_data', candle_count: candles.length },
      timestamp: new Date(),
    };
  }

  const { close, high, low, volume } = extractPrices(candles);

  // Calcul de tous les indicateurs
  const indicators: IndicatorScore[] = [
    scoreRSI(close),
    scoreMACD(close),
    scoreBollinger(close),
    scoreEMACross(close),
    scoreEMA200Position(close),
    scoreStochastic(high, low, close),
    scoreADX(high, low, close),
    scoreOBV(close, volume),
    scoreCCI(high, low, close),
    scoreWilliamsR(high, low, close),
    scoreMFI(high, low, close, volume),
  ];

  // ATR pour position sizing et regime
  const atrValues = ATR.calculate({ high, low, close, period: ATR_PERIOD });
  const atrValue = lastValue(atrValues) ?? 0;

  // ADX pour regime
  const adxIndicator = indicators.find((i) => i.name === 'adx');
  const adxValue = typeof adxIndicator?.value === 'number' ? adxIndicator.value : 0;

  // Regime de marche
  const regime = detectMarketRegime(adxValue, atrValue, close);

  // Score composite pondere
  let weightedScore = 0;
  let totalWeight = 0;

  for (const indicator of indicators) {
    const weight = INDICATOR_WEIGHTS[indicator.name] ?? 0.05;
    weightedScore += indicator.score * weight;
    totalWeight += weight;
  }

  const compositeScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  // Confidence basee sur l'alignement des indicateurs
  const bullishCount = indicators.filter((i) => i.signal === 'bullish').length;
  const bearishCount = indicators.filter((i) => i.signal === 'bearish').length;
  const totalIndicators = indicators.length;
  const alignment = Math.max(bullishCount, bearishCount) / totalIndicators;
  const confidence = Math.min(0.95, alignment * (adxValue > 25 ? 1.2 : 0.8));

  // Signal final
  let signal: AgentResult['signal'];
  if (compositeScore > 0.15) {
    signal = 'bullish';
  } else if (compositeScore < -0.15) {
    signal = 'bearish';
  } else {
    signal = 'neutral';
  }

  // Reasoning
  const topBullish = indicators
    .filter((i) => i.signal === 'bullish')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const topBearish = indicators
    .filter((i) => i.signal === 'bearish')
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const currentPrice = lastValue(close) ?? 0;
  const ema200 = lastValue(EMA.calculate({ values: close, period: 200 })) ?? null;

  const reasoning = [
    `Analyse technique ${pair} — Regime: ${regime}`,
    `Score composite: ${compositeScore.toFixed(3)} | Signal: ${signal.toUpperCase()}`,
    `Indicateurs haussiers (${bullishCount}): ${topBullish.map((i) => i.interpretation).join('; ')}`,
    `Indicateurs baissiers (${bearishCount}): ${topBearish.map((i) => i.interpretation).join('; ')}`,
    `ATR: ${atrValue.toFixed(4)} | ADX: ${adxValue.toFixed(1)} | RSI: ${(indicators.find((i) => i.name === 'rsi')?.value ?? 'N/A')}`,
  ].join('\n');

  const technicalData: TechnicalData = {
    indicators,
    regime,
    atr_value: atrValue,
    adx_value: adxValue,
    rsi_value: typeof indicators.find((i) => i.name === 'rsi')?.value === 'number'
      ? indicators.find((i) => i.name === 'rsi')!.value as number
      : 0,
    current_price: currentPrice,
    ema_200: ema200,
  };

  return {
    agent_name: 'technical',
    signal,
    score: compositeScore,
    confidence,
    reasoning,
    data: technicalData as unknown as Record<string, unknown>,
    timestamp: new Date(),
  };
}
