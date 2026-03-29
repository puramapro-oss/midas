// =============================================================================
// MIDAS — Scalping Strategy
// Ultra-short-term trades targeting small moves with tight risk management
// =============================================================================

import type { Candle } from '@/types/trading';
import { BaseStrategy, type StrategyConfig, type StrategySignal } from './base-strategy';

interface ScalpingConfig extends StrategyConfig {
  rsi_period: number;
  rsi_upper: number;
  rsi_lower: number;
  ema_fast: number;
  ema_medium: number;
  atr_sl_multiplier: number;
  atr_tp_multiplier: number;
  min_volume_ratio: number;
  max_spread_pct: number;
}

const DEFAULT_SCALP: Omit<ScalpingConfig, keyof StrategyConfig> = {
  rsi_period: 7,
  rsi_upper: 65,
  rsi_lower: 35,
  ema_fast: 5,
  ema_medium: 13,
  atr_sl_multiplier: 1,
  atr_tp_multiplier: 1.5,
  min_volume_ratio: 1.0,
  max_spread_pct: 0.1,
};

export class ScalpingStrategy extends BaseStrategy {
  name = 'Scalping';
  private scalpConfig: ScalpingConfig;

  constructor(config: StrategyConfig, overrides?: Partial<Omit<ScalpingConfig, keyof StrategyConfig>>) {
    super(config);
    this.scalpConfig = { ...config, ...DEFAULT_SCALP, ...overrides };
  }

  async analyze(candles: Candle[], _indicators: Record<string, unknown>): Promise<StrategySignal> {
    const last = this.getLastCandle(candles);
    const price = last.close;

    // Use short-period indicators for scalping
    const rsi = this.calculateRSI(candles, this.scalpConfig.rsi_period);
    const fastEMA = this.calculateEMA(candles, this.scalpConfig.ema_fast);
    const medEMA = this.calculateEMA(candles, this.scalpConfig.ema_medium);
    const atr = this.calculateATR(candles, 7); // Shorter ATR for scalping
    const avgVolume = this.calculateAverageVolume(candles, 10);

    const currentFast = fastEMA[fastEMA.length - 1] ?? 0;
    const currentMed = medEMA[medEMA.length - 1] ?? 0;
    const prevFast = fastEMA[fastEMA.length - 2] ?? 0;
    const prevMed = medEMA[medEMA.length - 2] ?? 0;

    // Volume filter
    const volumeRatio = avgVolume > 0 ? last.volume / avgVolume : 0;
    const volumeOk = volumeRatio >= this.scalpConfig.min_volume_ratio;

    // Spread estimation from candle body
    const spread = last.high > 0 ? ((last.high - last.low) / last.high) * 100 : 0;
    const spreadOk = spread <= this.scalpConfig.max_spread_pct * 10; // Allow some range

    // Candle momentum
    const bodySize = Math.abs(last.close - last.open);
    const totalRange = last.high - last.low;
    const bodyRatio = totalRange > 0 ? bodySize / totalRange : 0;
    const isBullishCandle = last.close > last.open;
    const isBearishCandle = last.close < last.open;

    // Upper/lower wick analysis
    const upperWick = isBullishCandle ? last.high - last.close : last.high - last.open;
    const lowerWick = isBullishCandle ? last.open - last.low : last.close - last.low;
    const upperWickRatio = totalRange > 0 ? upperWick / totalRange : 0;
    const lowerWickRatio = totalRange > 0 ? lowerWick / totalRange : 0;

    // EMA micro-crossover
    const bullishMicro = prevFast <= prevMed && currentFast > currentMed;
    const bearishMicro = prevFast >= prevMed && currentFast < currentMed;
    const fastAboveMed = currentFast > currentMed;
    const fastBelowMed = currentFast < currentMed;

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.4;
    let reasoning = '';

    if (!volumeOk) {
      return {
        action: 'hold',
        confidence: 0.2,
        entry_price: price,
        stop_loss: 0,
        take_profit: 0,
        reasoning: `Volume too low (${volumeRatio.toFixed(2)}x avg). Scalping requires liquidity.`,
      };
    }

    // Bullish scalp
    if (
      (bullishMicro || (fastAboveMed && rsi > 50)) &&
      rsi < this.scalpConfig.rsi_upper &&
      isBullishCandle &&
      bodyRatio > 0.5 &&
      spreadOk
    ) {
      action = 'buy';
      confidence = 0.6;
      reasoning = `Scalp buy: `;
      if (bullishMicro) reasoning += 'EMA micro-crossover bullish. ';
      reasoning += `RSI ${rsi.toFixed(1)}, body ratio ${(bodyRatio * 100).toFixed(0)}%. `;
      reasoning += `Volume ${volumeRatio.toFixed(1)}x average. `;

      if (lowerWickRatio > 0.3) {
        confidence += 0.05;
        reasoning += 'Strong rejection wick. ';
      }
    }
    // Bearish scalp
    else if (
      (bearishMicro || (fastBelowMed && rsi < 50)) &&
      rsi > this.scalpConfig.rsi_lower &&
      isBearishCandle &&
      bodyRatio > 0.5 &&
      spreadOk
    ) {
      action = 'sell';
      confidence = 0.6;
      reasoning = `Scalp sell: `;
      if (bearishMicro) reasoning += 'EMA micro-crossover bearish. ';
      reasoning += `RSI ${rsi.toFixed(1)}, body ratio ${(bodyRatio * 100).toFixed(0)}%. `;
      reasoning += `Volume ${volumeRatio.toFixed(1)}x average. `;

      if (upperWickRatio > 0.3) {
        confidence += 0.05;
        reasoning += 'Strong rejection wick. ';
      }
    } else {
      reasoning = `No scalp setup. RSI ${rsi.toFixed(1)}, EMA fast ${currentFast.toFixed(2)}/med ${currentMed.toFixed(2)}.`;
    }

    // Volume boost
    if (action !== 'hold' && volumeRatio > 2.0) {
      confidence += 0.05;
      reasoning += `High volume (${volumeRatio.toFixed(1)}x) confirms. `;
    }

    confidence = Math.max(0.1, Math.min(0.95, confidence));

    // Tight SL/TP for scalping
    const slDistance = atr * this.scalpConfig.atr_sl_multiplier;
    const tpDistance = atr * this.scalpConfig.atr_tp_multiplier;

    return {
      action,
      confidence,
      entry_price: price,
      stop_loss: action === 'buy' ? price - slDistance : action === 'sell' ? price + slDistance : 0,
      take_profit: action === 'buy' ? price + tpDistance : action === 'sell' ? price - tpDistance : 0,
      reasoning,
    };
  }
}
