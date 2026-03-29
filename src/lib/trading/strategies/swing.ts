// =============================================================================
// MIDAS — Swing Trading Strategy
// Medium-term trades capturing multi-day price swings with trend following
// =============================================================================

import type { Candle } from '@/types/trading';
import { BaseStrategy, type StrategyConfig, type StrategySignal } from './base-strategy';

interface SwingConfig extends StrategyConfig {
  ema_fast: number;
  ema_slow: number;
  ema_trend: number;
  rsi_period: number;
  rsi_oversold: number;
  rsi_overbought: number;
  atr_sl_multiplier: number;
  atr_tp_multiplier: number;
  swing_lookback: number;
}

const DEFAULT_SWING: Omit<SwingConfig, keyof StrategyConfig> = {
  ema_fast: 12,
  ema_slow: 26,
  ema_trend: 50,
  rsi_period: 14,
  rsi_oversold: 40,
  rsi_overbought: 60,
  atr_sl_multiplier: 2.5,
  atr_tp_multiplier: 4,
  swing_lookback: 20,
};

export class SwingStrategy extends BaseStrategy {
  name = 'Swing Trading';
  private swingConfig: SwingConfig;

  constructor(config: StrategyConfig, overrides?: Partial<Omit<SwingConfig, keyof StrategyConfig>>) {
    super(config);
    this.swingConfig = { ...config, ...DEFAULT_SWING, ...overrides };
  }

  async analyze(candles: Candle[], _indicators: Record<string, unknown>): Promise<StrategySignal> {
    const last = this.getLastCandle(candles);
    const price = last.close;

    // Multi-EMA trend analysis
    const fastEMA = this.calculateEMA(candles, this.swingConfig.ema_fast);
    const slowEMA = this.calculateEMA(candles, this.swingConfig.ema_slow);
    const trendEMA = this.calculateEMA(candles, this.swingConfig.ema_trend);

    const currentFast = fastEMA[fastEMA.length - 1] ?? 0;
    const currentSlow = slowEMA[slowEMA.length - 1] ?? 0;
    const currentTrend = trendEMA[trendEMA.length - 1] ?? 0;
    const prevFast = fastEMA[fastEMA.length - 2] ?? 0;
    const prevSlow = slowEMA[slowEMA.length - 2] ?? 0;

    const rsi = this.calculateRSI(candles, this.swingConfig.rsi_period);
    const atr = this.calculateATR(candles, 14);
    const bb = this.calculateBollingerBands(candles, 20, 2);
    const avgVolume = this.calculateAverageVolume(candles, 20);

    // Swing high/low levels
    const swingHigh = this.findSwingHigh(candles, this.swingConfig.swing_lookback);
    const swingLow = this.findSwingLow(candles, this.swingConfig.swing_lookback);
    const fib = this.calculateFibonacciLevels(swingHigh, swingLow);

    // Trend determination
    const uptrend = currentFast > currentSlow && currentSlow > currentTrend;
    const downtrend = currentFast < currentSlow && currentSlow < currentTrend;

    // MACD-like signal from EMA crossover
    const bullishCross = prevFast <= prevSlow && currentFast > currentSlow;
    const bearishCross = prevFast >= prevSlow && currentFast < currentSlow;

    // Pullback detection in trend
    const bullishPullback = uptrend && price <= currentFast * 1.005 && price > currentSlow;
    const bearishPullback = downtrend && price >= currentFast * 0.995 && price < currentSlow;

    // Near Fibonacci support/resistance
    const nearFib382 = Math.abs(price - fib['0.382']) / price < 0.005;
    const nearFib618 = Math.abs(price - fib['0.618']) / price < 0.005;

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.4;
    let reasoning = '';

    // Buy setups
    if (bullishCross && uptrend && rsi > this.swingConfig.rsi_oversold) {
      action = 'buy';
      confidence = 0.75;
      reasoning = `Swing buy: bullish EMA cross in uptrend. RSI ${rsi.toFixed(1)}. Price above trend EMA (${currentTrend.toFixed(2)}). `;
    } else if (bullishPullback && rsi < 55) {
      action = 'buy';
      confidence = 0.65;
      reasoning = `Swing buy: pullback to fast EMA in uptrend. RSI ${rsi.toFixed(1)} shows room to run. `;

      if (nearFib382 || nearFib618) {
        confidence += 0.1;
        reasoning += 'Price at Fibonacci support level. ';
      }
    } else if (uptrend && price <= bb.lower * 1.01 && rsi < 45) {
      action = 'buy';
      confidence = 0.6;
      reasoning = `Swing buy: price at lower BB in uptrend. Potential swing low. RSI ${rsi.toFixed(1)}. `;
    }
    // Sell setups
    else if (bearishCross && downtrend && rsi < this.swingConfig.rsi_overbought) {
      action = 'sell';
      confidence = 0.75;
      reasoning = `Swing sell: bearish EMA cross in downtrend. RSI ${rsi.toFixed(1)}. Price below trend EMA (${currentTrend.toFixed(2)}). `;
    } else if (bearishPullback && rsi > 45) {
      action = 'sell';
      confidence = 0.65;
      reasoning = `Swing sell: rally to fast EMA in downtrend. RSI ${rsi.toFixed(1)} shows weakness. `;

      if (nearFib382 || nearFib618) {
        confidence += 0.1;
        reasoning += 'Price at Fibonacci resistance level. ';
      }
    } else if (downtrend && price >= bb.upper * 0.99 && rsi > 55) {
      action = 'sell';
      confidence = 0.6;
      reasoning = `Swing sell: price at upper BB in downtrend. Potential swing high. RSI ${rsi.toFixed(1)}. `;
    } else {
      reasoning = `No swing setup. Trend: ${uptrend ? 'up' : downtrend ? 'down' : 'unclear'}. `;
      reasoning += `EMAs: fast ${currentFast.toFixed(2)}, slow ${currentSlow.toFixed(2)}, trend ${currentTrend.toFixed(2)}. RSI ${rsi.toFixed(1)}.`;
    }

    // Volume confirmation
    if (action !== 'hold' && last.volume > avgVolume * 1.3) {
      confidence += 0.05;
      reasoning += 'Volume confirms the move. ';
    }

    confidence = Math.max(0.1, Math.min(0.95, confidence));

    // Wider SL/TP for swing trades
    const slDistance = atr * this.swingConfig.atr_sl_multiplier;
    const tpDistance = atr * this.swingConfig.atr_tp_multiplier;

    // Use swing levels for smarter SL placement
    let stopLoss = 0;
    let takeProfit = 0;

    if (action === 'buy') {
      stopLoss = Math.min(price - slDistance, swingLow * 0.995);
      takeProfit = Math.max(price + tpDistance, swingHigh * 0.995);
    } else if (action === 'sell') {
      stopLoss = Math.max(price + slDistance, swingHigh * 1.005);
      takeProfit = Math.min(price - tpDistance, swingLow * 1.005);
    }

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
