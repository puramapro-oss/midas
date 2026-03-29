// =============================================================================
// MIDAS — Smart Entry Strategy
// Patient, high-conviction entries combining multiple confluence factors
// =============================================================================

import type { Candle } from '@/types/trading';
import { BaseStrategy, type StrategyConfig, type StrategySignal } from './base-strategy';

interface SmartEntryConfig extends StrategyConfig {
  min_confluence_score: number; // Minimum score out of 100 to trigger
  ema_fast: number;
  ema_slow: number;
  ema_trend: number;
  rsi_period: number;
  bb_period: number;
  atr_sl_multiplier: number;
  atr_tp_multiplier: number;
}

const DEFAULT_SMART: Omit<SmartEntryConfig, keyof StrategyConfig> = {
  min_confluence_score: 65,
  ema_fast: 9,
  ema_slow: 21,
  ema_trend: 50,
  rsi_period: 14,
  bb_period: 20,
  atr_sl_multiplier: 2,
  atr_tp_multiplier: 3.5,
};

interface ConfluenceFactor {
  name: string;
  weight: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100 to +100
  detail: string;
}

export class SmartEntryStrategy extends BaseStrategy {
  name = 'Smart Entry';
  private smartConfig: SmartEntryConfig;

  constructor(config: StrategyConfig, overrides?: Partial<Omit<SmartEntryConfig, keyof StrategyConfig>>) {
    super(config);
    this.smartConfig = { ...config, ...DEFAULT_SMART, ...overrides };
  }

  async analyze(candles: Candle[], _indicators: Record<string, unknown>): Promise<StrategySignal> {
    const last = this.getLastCandle(candles);
    const price = last.close;

    // Gather all confluence factors
    const factors = this.evaluateConfluence(candles);
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

    // Calculate weighted score (-100 to +100)
    const weightedScore = totalWeight > 0
      ? factors.reduce((sum, f) => sum + f.score * (f.weight / totalWeight), 0)
      : 0;

    const bullishCount = factors.filter((f) => f.signal === 'bullish').length;
    const bearishCount = factors.filter((f) => f.signal === 'bearish').length;

    const atr = this.calculateATR(candles, 14);

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.3;
    let reasoning = '';

    // Strong bullish confluence
    if (weightedScore >= this.smartConfig.min_confluence_score && bullishCount >= 4) {
      action = 'buy';
      confidence = this.scoreToConfidence(weightedScore);
      reasoning = `Smart entry BUY: confluence score ${weightedScore.toFixed(0)}/100 (${bullishCount} bullish factors). `;
    }
    // Strong bearish confluence
    else if (weightedScore <= -this.smartConfig.min_confluence_score && bearishCount >= 4) {
      action = 'sell';
      confidence = this.scoreToConfidence(Math.abs(weightedScore));
      reasoning = `Smart entry SELL: confluence score ${weightedScore.toFixed(0)}/100 (${bearishCount} bearish factors). `;
    } else {
      reasoning = `Waiting for confluence. Score: ${weightedScore.toFixed(0)}/100 (need >${this.smartConfig.min_confluence_score}). `;
      reasoning += `Bullish: ${bullishCount}, Bearish: ${bearishCount}, Neutral: ${factors.length - bullishCount - bearishCount}. `;
    }

    // Add factor details to reasoning
    if (action !== 'hold') {
      const relevantFactors = factors
        .filter((f) => f.signal !== 'neutral')
        .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
        .slice(0, 3);

      reasoning += 'Top factors: ' + relevantFactors.map((f) => f.detail).join('; ') + '.';
    }

    const slDistance = atr * this.smartConfig.atr_sl_multiplier;
    const tpDistance = atr * this.smartConfig.atr_tp_multiplier;

    return {
      action,
      confidence: Math.max(0.1, Math.min(0.95, confidence)),
      entry_price: price,
      stop_loss: action === 'buy' ? price - slDistance : action === 'sell' ? price + slDistance : 0,
      take_profit: action === 'buy' ? price + tpDistance : action === 'sell' ? price - tpDistance : 0,
      reasoning,
    };
  }

  private evaluateConfluence(candles: Candle[]): ConfluenceFactor[] {
    const factors: ConfluenceFactor[] = [];
    const last = this.getLastCandle(candles);
    const price = last.close;

    // 1. EMA Alignment (weight: 20)
    factors.push(this.checkEMAAlignment(candles, price));

    // 2. RSI Position (weight: 15)
    factors.push(this.checkRSI(candles));

    // 3. Bollinger Band Position (weight: 15)
    factors.push(this.checkBollingerPosition(candles, price));

    // 4. Volume Confirmation (weight: 15)
    factors.push(this.checkVolumeProfile(candles));

    // 5. Support/Resistance Proximity (weight: 15)
    factors.push(this.checkKeyLevels(candles, price));

    // 6. Candle Pattern (weight: 10)
    factors.push(this.checkCandlePattern(candles));

    // 7. Trend Consistency (weight: 10)
    factors.push(this.checkTrendConsistency(candles));

    return factors;
  }

  private checkEMAAlignment(candles: Candle[], price: number): ConfluenceFactor {
    const fast = this.calculateEMA(candles, this.smartConfig.ema_fast);
    const slow = this.calculateEMA(candles, this.smartConfig.ema_slow);
    const trend = this.calculateEMA(candles, this.smartConfig.ema_trend);

    const f = fast[fast.length - 1] ?? 0;
    const s = slow[slow.length - 1] ?? 0;
    const t = trend[trend.length - 1] ?? 0;

    if (f > s && s > t && price > f) {
      return {
        name: 'EMA Alignment',
        weight: 20,
        signal: 'bullish',
        score: 80,
        detail: `Perfect bullish EMA stack (${this.smartConfig.ema_fast}>${this.smartConfig.ema_slow}>${this.smartConfig.ema_trend})`,
      };
    }

    if (f < s && s < t && price < f) {
      return {
        name: 'EMA Alignment',
        weight: 20,
        signal: 'bearish',
        score: -80,
        detail: `Perfect bearish EMA stack (${this.smartConfig.ema_fast}<${this.smartConfig.ema_slow}<${this.smartConfig.ema_trend})`,
      };
    }

    if (f > s && price > t) {
      return {
        name: 'EMA Alignment',
        weight: 20,
        signal: 'bullish',
        score: 40,
        detail: 'Partial bullish EMA setup',
      };
    }

    if (f < s && price < t) {
      return {
        name: 'EMA Alignment',
        weight: 20,
        signal: 'bearish',
        score: -40,
        detail: 'Partial bearish EMA setup',
      };
    }

    return {
      name: 'EMA Alignment',
      weight: 20,
      signal: 'neutral',
      score: 0,
      detail: 'EMAs not aligned',
    };
  }

  private checkRSI(candles: Candle[]): ConfluenceFactor {
    const rsi = this.calculateRSI(candles, this.smartConfig.rsi_period);

    if (rsi < 30) {
      return { name: 'RSI', weight: 15, signal: 'bullish', score: 70, detail: `RSI deeply oversold at ${rsi.toFixed(1)}` };
    }
    if (rsi < 40) {
      return { name: 'RSI', weight: 15, signal: 'bullish', score: 40, detail: `RSI approaching oversold at ${rsi.toFixed(1)}` };
    }
    if (rsi > 70) {
      return { name: 'RSI', weight: 15, signal: 'bearish', score: -70, detail: `RSI deeply overbought at ${rsi.toFixed(1)}` };
    }
    if (rsi > 60) {
      return { name: 'RSI', weight: 15, signal: 'bearish', score: -40, detail: `RSI approaching overbought at ${rsi.toFixed(1)}` };
    }

    return { name: 'RSI', weight: 15, signal: 'neutral', score: 0, detail: `RSI neutral at ${rsi.toFixed(1)}` };
  }

  private checkBollingerPosition(candles: Candle[], price: number): ConfluenceFactor {
    const bb = this.calculateBollingerBands(candles, this.smartConfig.bb_period, 2);
    const bandwidth = bb.upper - bb.lower;
    const position = bandwidth > 0 ? (price - bb.lower) / bandwidth : 0.5;

    if (position <= 0.05) {
      return { name: 'Bollinger', weight: 15, signal: 'bullish', score: 80, detail: 'Price at lower Bollinger Band' };
    }
    if (position <= 0.2) {
      return { name: 'Bollinger', weight: 15, signal: 'bullish', score: 50, detail: 'Price in lower Bollinger zone' };
    }
    if (position >= 0.95) {
      return { name: 'Bollinger', weight: 15, signal: 'bearish', score: -80, detail: 'Price at upper Bollinger Band' };
    }
    if (position >= 0.8) {
      return { name: 'Bollinger', weight: 15, signal: 'bearish', score: -50, detail: 'Price in upper Bollinger zone' };
    }

    return { name: 'Bollinger', weight: 15, signal: 'neutral', score: 0, detail: 'Price in middle of Bollinger range' };
  }

  private checkVolumeProfile(candles: Candle[]): ConfluenceFactor {
    const last = this.getLastCandle(candles);
    const avg = this.calculateAverageVolume(candles, 20);
    const ratio = avg > 0 ? last.volume / avg : 1;
    const isBullish = last.close > last.open;

    if (ratio > 2.0 && isBullish) {
      return { name: 'Volume', weight: 15, signal: 'bullish', score: 70, detail: `Strong bullish volume (${ratio.toFixed(1)}x avg)` };
    }
    if (ratio > 2.0 && !isBullish) {
      return { name: 'Volume', weight: 15, signal: 'bearish', score: -70, detail: `Strong bearish volume (${ratio.toFixed(1)}x avg)` };
    }
    if (ratio > 1.3 && isBullish) {
      return { name: 'Volume', weight: 15, signal: 'bullish', score: 40, detail: `Above-average bullish volume (${ratio.toFixed(1)}x)` };
    }
    if (ratio > 1.3 && !isBullish) {
      return { name: 'Volume', weight: 15, signal: 'bearish', score: -40, detail: `Above-average bearish volume (${ratio.toFixed(1)}x)` };
    }

    return { name: 'Volume', weight: 15, signal: 'neutral', score: 0, detail: `Normal volume (${ratio.toFixed(1)}x avg)` };
  }

  private checkKeyLevels(candles: Candle[], price: number): ConfluenceFactor {
    const swingHigh = this.findSwingHigh(candles, 20);
    const swingLow = this.findSwingLow(candles, 20);
    const fib = this.calculateFibonacciLevels(swingHigh, swingLow);

    const nearSupport = Math.abs(price - swingLow) / price < 0.01;
    const nearResistance = Math.abs(price - swingHigh) / price < 0.01;
    const nearFib618 = Math.abs(price - fib['0.618']) / price < 0.005;
    const nearFib382 = Math.abs(price - fib['0.382']) / price < 0.005;

    if (nearSupport) {
      return { name: 'Key Levels', weight: 15, signal: 'bullish', score: 70, detail: 'Price at swing low support' };
    }
    if (nearResistance) {
      return { name: 'Key Levels', weight: 15, signal: 'bearish', score: -70, detail: 'Price at swing high resistance' };
    }
    if (nearFib618) {
      return { name: 'Key Levels', weight: 15, signal: 'bullish', score: 60, detail: 'Price at 0.618 Fibonacci support' };
    }
    if (nearFib382) {
      return { name: 'Key Levels', weight: 15, signal: 'bearish', score: -50, detail: 'Price at 0.382 Fibonacci resistance' };
    }

    return { name: 'Key Levels', weight: 15, signal: 'neutral', score: 0, detail: 'No key level proximity' };
  }

  private checkCandlePattern(candles: Candle[]): ConfluenceFactor {
    if (candles.length < 3) {
      return { name: 'Candle Pattern', weight: 10, signal: 'neutral', score: 0, detail: 'Insufficient candles' };
    }

    const c0 = candles[candles.length - 1];
    const c1 = candles[candles.length - 2];
    const c2 = candles[candles.length - 3];

    if (!c0 || !c1 || !c2) {
      return { name: 'Candle Pattern', weight: 10, signal: 'neutral', score: 0, detail: 'Missing candle data' };
    }

    // Bullish engulfing
    if (c1.close < c1.open && c0.close > c0.open && c0.close > c1.open && c0.open < c1.close) {
      return { name: 'Candle Pattern', weight: 10, signal: 'bullish', score: 70, detail: 'Bullish engulfing pattern' };
    }

    // Bearish engulfing
    if (c1.close > c1.open && c0.close < c0.open && c0.close < c1.open && c0.open > c1.close) {
      return { name: 'Candle Pattern', weight: 10, signal: 'bearish', score: -70, detail: 'Bearish engulfing pattern' };
    }

    // Hammer (long lower wick, small body at top)
    const range0 = c0.high - c0.low;
    const body0 = Math.abs(c0.close - c0.open);
    const lowerWick = Math.min(c0.close, c0.open) - c0.low;
    if (range0 > 0 && body0 / range0 < 0.3 && lowerWick / range0 > 0.6) {
      return { name: 'Candle Pattern', weight: 10, signal: 'bullish', score: 60, detail: 'Hammer pattern' };
    }

    // Shooting star (long upper wick, small body at bottom)
    const upperWick = c0.high - Math.max(c0.close, c0.open);
    if (range0 > 0 && body0 / range0 < 0.3 && upperWick / range0 > 0.6) {
      return { name: 'Candle Pattern', weight: 10, signal: 'bearish', score: -60, detail: 'Shooting star pattern' };
    }

    // Three rising candles (bullish) or three falling (bearish)
    if (c0.close > c1.close && c1.close > c2.close) {
      return { name: 'Candle Pattern', weight: 10, signal: 'bullish', score: 40, detail: 'Three consecutive bullish closes' };
    }
    if (c0.close < c1.close && c1.close < c2.close) {
      return { name: 'Candle Pattern', weight: 10, signal: 'bearish', score: -40, detail: 'Three consecutive bearish closes' };
    }

    return { name: 'Candle Pattern', weight: 10, signal: 'neutral', score: 0, detail: 'No clear candle pattern' };
  }

  private checkTrendConsistency(candles: Candle[]): ConfluenceFactor {
    if (candles.length < 20) {
      return { name: 'Trend', weight: 10, signal: 'neutral', score: 0, detail: 'Insufficient data for trend' };
    }

    // Count higher highs + higher lows vs lower highs + lower lows over last 10 candles
    const recent = candles.slice(-10);
    let higherHighs = 0;
    let higherLows = 0;
    let lowerHighs = 0;
    let lowerLows = 0;

    for (let i = 1; i < recent.length; i++) {
      const curr = recent[i];
      const prev = recent[i - 1];
      if (!curr || !prev) continue;

      if (curr.high > prev.high) higherHighs++;
      else lowerHighs++;
      if (curr.low > prev.low) higherLows++;
      else lowerLows++;
    }

    const bullishScore = higherHighs + higherLows;
    const bearishScore = lowerHighs + lowerLows;
    const total = bullishScore + bearishScore;

    if (total === 0) {
      return { name: 'Trend', weight: 10, signal: 'neutral', score: 0, detail: 'No trend data' };
    }

    const bullishPct = bullishScore / total;

    if (bullishPct > 0.7) {
      return { name: 'Trend', weight: 10, signal: 'bullish', score: 60, detail: `Consistent uptrend (${(bullishPct * 100).toFixed(0)}% higher swings)` };
    }
    if (bullishPct < 0.3) {
      return { name: 'Trend', weight: 10, signal: 'bearish', score: -60, detail: `Consistent downtrend (${((1 - bullishPct) * 100).toFixed(0)}% lower swings)` };
    }

    return { name: 'Trend', weight: 10, signal: 'neutral', score: 0, detail: 'Trend unclear' };
  }

  private scoreToConfidence(absScore: number): number {
    // Map score (0-100) to confidence (0.5-0.9)
    return 0.5 + (Math.min(absScore, 100) / 100) * 0.4;
  }
}
