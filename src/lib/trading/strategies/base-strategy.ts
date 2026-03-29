// =============================================================================
// MIDAS — Base Strategy
// Classe abstraite pour toutes les stratégies de trading
// =============================================================================

import type { Candle } from '@/types/trading';

export interface StrategySignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  reasoning: string;
}

export interface StrategyConfig {
  pair: string;
  timeframe: string;
  risk_per_trade: number;
  allocated_capital: number;
}

export abstract class BaseStrategy {
  constructor(protected config: StrategyConfig) {}

  abstract name: string;

  abstract analyze(
    candles: Candle[],
    indicators: Record<string, unknown>
  ): Promise<StrategySignal>;

  protected getLastCandle(candles: Candle[]): Candle {
    const last = candles[candles.length - 1];
    if (!last) {
      throw new Error('No candles available for analysis');
    }
    return last;
  }

  protected calculateATR(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) {
      throw new Error(`Not enough candles for ATR calculation. Need ${period + 1}, got ${candles.length}`);
    }

    const trueRanges: number[] = [];

    for (let i = 1; i <= period; i++) {
      const current = candles[candles.length - i];
      const previous = candles[candles.length - i - 1];
      if (!current || !previous) continue;

      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      trueRanges.push(tr);
    }

    if (trueRanges.length === 0) return 0;
    return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  }

  protected calculateEMA(candles: Candle[], period: number, field: 'close' | 'high' | 'low' | 'volume' = 'close'): number[] {
    if (candles.length < period) {
      throw new Error(`Not enough candles for EMA(${period}). Need ${period}, got ${candles.length}`);
    }

    const values = candles.map((c) => c[field]);
    const multiplier = 2 / (period + 1);
    const ema: number[] = [];

    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i] ?? 0;
    }
    ema.push(sum / period);

    for (let i = period; i < values.length; i++) {
      const value = values[i] ?? 0;
      const prev = ema[ema.length - 1] ?? 0;
      ema.push(value * multiplier + prev * (1 - multiplier));
    }

    return ema;
  }

  protected calculateRSI(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) {
      throw new Error(`Not enough candles for RSI. Need ${period + 1}, got ${candles.length}`);
    }

    let gains = 0;
    let losses = 0;

    for (let i = candles.length - period; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      if (!current || !previous) continue;

      const change = current.close - previous.close;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  protected calculateBollingerBands(candles: Candle[], period: number = 20, stdDevMultiplier: number = 2): {
    upper: number;
    middle: number;
    lower: number;
  } {
    if (candles.length < period) {
      throw new Error(`Not enough candles for Bollinger Bands. Need ${period}, got ${candles.length}`);
    }

    const recentCloses = candles.slice(-period).map((c) => c.close);
    const middle = recentCloses.reduce((sum, v) => sum + v, 0) / period;

    const squaredDiffs = recentCloses.map((v) => Math.pow(v - middle, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: middle + stdDev * stdDevMultiplier,
      middle,
      lower: middle - stdDev * stdDevMultiplier,
    };
  }

  protected calculateAverageVolume(candles: Candle[], period: number = 20): number {
    if (candles.length < period) {
      return candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    }
    const recent = candles.slice(-period);
    return recent.reduce((sum, c) => sum + c.volume, 0) / period;
  }

  protected findSwingLow(candles: Candle[], lookback: number = 10): number {
    const recent = candles.slice(-lookback);
    return Math.min(...recent.map((c) => c.low));
  }

  protected findSwingHigh(candles: Candle[], lookback: number = 10): number {
    const recent = candles.slice(-lookback);
    return Math.max(...recent.map((c) => c.high));
  }

  protected calculateFibonacciLevels(high: number, low: number): Record<string, number> {
    const diff = high - low;
    return {
      '0.0': high,
      '0.236': high - diff * 0.236,
      '0.382': high - diff * 0.382,
      '0.5': high - diff * 0.5,
      '0.618': high - diff * 0.618,
      '0.786': high - diff * 0.786,
      '1.0': low,
    };
  }
}
