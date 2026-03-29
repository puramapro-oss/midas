// =============================================================================
// MIDAS — Mean Reversion Strategy
// Trades price extremes expecting return to mean (Bollinger Bands + RSI)
// =============================================================================

import type { Candle } from '@/types/trading';
import { BaseStrategy, type StrategyConfig, type StrategySignal } from './base-strategy';

interface MeanReversionConfig extends StrategyConfig {
  bb_period: number;
  bb_std_dev: number;
  rsi_period: number;
  rsi_oversold: number;
  rsi_overbought: number;
  atr_sl_multiplier: number;
  mean_target_pct: number; // How close to mean for TP (0-1, 1=full mean)
}

const DEFAULT_MR: Omit<MeanReversionConfig, keyof StrategyConfig> = {
  bb_period: 20,
  bb_std_dev: 2,
  rsi_period: 14,
  rsi_oversold: 30,
  rsi_overbought: 70,
  atr_sl_multiplier: 2.5,
  mean_target_pct: 0.8,
};

export class MeanReversionStrategy extends BaseStrategy {
  name = 'Mean Reversion';
  private mrConfig: MeanReversionConfig;

  constructor(config: StrategyConfig, overrides?: Partial<Omit<MeanReversionConfig, keyof StrategyConfig>>) {
    super(config);
    this.mrConfig = { ...config, ...DEFAULT_MR, ...overrides };
  }

  async analyze(candles: Candle[], _indicators: Record<string, unknown>): Promise<StrategySignal> {
    const last = this.getLastCandle(candles);
    const price = last.close;

    const bb = this.calculateBollingerBands(candles, this.mrConfig.bb_period, this.mrConfig.bb_std_dev);
    const rsi = this.calculateRSI(candles, this.mrConfig.rsi_period);
    const atr = this.calculateATR(candles, 14);
    const avgVolume = this.calculateAverageVolume(candles, 20);

    // How far price is from the mean (normalized: -1 = lower band, 0 = mean, +1 = upper band)
    const bandWidth = bb.upper - bb.lower;
    const deviation = bandWidth > 0 ? (price - bb.middle) / (bandWidth / 2) : 0;

    // Check for mean reversion conditions
    const belowLowerBand = price <= bb.lower;
    const aboveUpperBand = price >= bb.upper;
    const nearLowerBand = price <= bb.lower * 1.01;
    const nearUpperBand = price >= bb.upper * 0.99;

    // Volume spike often accompanies reversals
    const volumeSpike = last.volume > avgVolume * 1.5;

    // Detect potential reversal candle patterns
    const prevCandle = candles.length >= 2 ? candles[candles.length - 2] : null;
    const bullishReversal = prevCandle
      ? last.close > last.open && prevCandle.close < prevCandle.open && last.close > prevCandle.open
      : false;
    const bearishReversal = prevCandle
      ? last.close < last.open && prevCandle.close > prevCandle.open && last.close < prevCandle.open
      : false;

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.4;
    let reasoning = '';

    // Buy signal: price at/below lower BB + RSI oversold
    if ((belowLowerBand || nearLowerBand) && rsi <= this.mrConfig.rsi_oversold) {
      action = 'buy';
      confidence = 0.7;
      reasoning = `Mean reversion buy: price at lower BB (${bb.lower.toFixed(2)}), RSI oversold at ${rsi.toFixed(1)}. `;
      reasoning += `Deviation: ${deviation.toFixed(2)} std from mean. `;

      if (bullishReversal) {
        confidence += 0.1;
        reasoning += 'Bullish reversal candle pattern detected. ';
      }
      if (volumeSpike) {
        confidence += 0.05;
        reasoning += 'Volume spike suggests capitulation. ';
      }
    }
    // Sell signal: price at/above upper BB + RSI overbought
    else if ((aboveUpperBand || nearUpperBand) && rsi >= this.mrConfig.rsi_overbought) {
      action = 'sell';
      confidence = 0.7;
      reasoning = `Mean reversion sell: price at upper BB (${bb.upper.toFixed(2)}), RSI overbought at ${rsi.toFixed(1)}. `;
      reasoning += `Deviation: ${deviation.toFixed(2)} std from mean. `;

      if (bearishReversal) {
        confidence += 0.1;
        reasoning += 'Bearish reversal candle pattern detected. ';
      }
      if (volumeSpike) {
        confidence += 0.05;
        reasoning += 'Volume spike suggests exhaustion. ';
      }
    }
    // Weaker signal: just RSI extreme without BB touch
    else if (rsi <= this.mrConfig.rsi_oversold && deviation < -0.5) {
      action = 'buy';
      confidence = 0.55;
      reasoning = `RSI oversold at ${rsi.toFixed(1)} with negative deviation (${deviation.toFixed(2)}). Approaching lower band.`;
    } else if (rsi >= this.mrConfig.rsi_overbought && deviation > 0.5) {
      action = 'sell';
      confidence = 0.55;
      reasoning = `RSI overbought at ${rsi.toFixed(1)} with positive deviation (${deviation.toFixed(2)}). Approaching upper band.`;
    } else {
      reasoning = `No mean reversion signal. Price near mean (deviation ${deviation.toFixed(2)}), RSI ${rsi.toFixed(1)}.`;
    }

    confidence = Math.max(0.1, Math.min(0.95, confidence));

    // TP targets the mean (or fraction of distance to mean)
    const distanceToMean = Math.abs(price - bb.middle) * this.mrConfig.mean_target_pct;
    const slDistance = atr * this.mrConfig.atr_sl_multiplier;

    const stopLoss = action === 'buy'
      ? price - slDistance
      : action === 'sell'
        ? price + slDistance
        : 0;

    const takeProfit = action === 'buy'
      ? price + distanceToMean
      : action === 'sell'
        ? price - distanceToMean
        : 0;

    return {
      action,
      confidence,
      entry_price: price,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      reasoning,
    };
  }
}
