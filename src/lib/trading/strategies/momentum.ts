// =============================================================================
// MIDAS — Momentum Strategy
// Rides strong directional moves with EMA crossovers and RSI confirmation
// =============================================================================

import type { Candle } from '@/types/trading';
import { BaseStrategy, type StrategyConfig, type StrategySignal } from './base-strategy';

interface MomentumConfig extends StrategyConfig {
  fast_ema: number;
  slow_ema: number;
  rsi_period: number;
  rsi_overbought: number;
  rsi_oversold: number;
  volume_confirmation: boolean;
  atr_sl_multiplier: number;
  atr_tp_multiplier: number;
}

const DEFAULT_MOMENTUM: Omit<MomentumConfig, keyof StrategyConfig> = {
  fast_ema: 9,
  slow_ema: 21,
  rsi_period: 14,
  rsi_overbought: 70,
  rsi_oversold: 30,
  volume_confirmation: true,
  atr_sl_multiplier: 2,
  atr_tp_multiplier: 3,
};

export class MomentumStrategy extends BaseStrategy {
  name = 'Momentum';
  private momConfig: MomentumConfig;

  constructor(config: StrategyConfig, overrides?: Partial<Omit<MomentumConfig, keyof StrategyConfig>>) {
    super(config);
    this.momConfig = { ...config, ...DEFAULT_MOMENTUM, ...overrides };
  }

  async analyze(candles: Candle[], _indicators: Record<string, unknown>): Promise<StrategySignal> {
    const last = this.getLastCandle(candles);
    const price = last.close;

    // Calculate indicators
    const fastEMA = this.calculateEMA(candles, this.momConfig.fast_ema);
    const slowEMA = this.calculateEMA(candles, this.momConfig.slow_ema);
    const rsi = this.calculateRSI(candles, this.momConfig.rsi_period);
    const atr = this.calculateATR(candles, 14);
    const avgVolume = this.calculateAverageVolume(candles, 20);

    const currentFast = fastEMA[fastEMA.length - 1] ?? 0;
    const currentSlow = slowEMA[slowEMA.length - 1] ?? 0;
    const prevFast = fastEMA[fastEMA.length - 2] ?? 0;
    const prevSlow = slowEMA[slowEMA.length - 2] ?? 0;

    // EMA crossover detection
    const bullishCross = prevFast <= prevSlow && currentFast > currentSlow;
    const bearishCross = prevFast >= prevSlow && currentFast < currentSlow;
    const fastAboveSlow = currentFast > currentSlow;
    const fastBelowSlow = currentFast < currentSlow;

    // Volume confirmation
    const volumeConfirmed = !this.momConfig.volume_confirmation || last.volume > avgVolume * 1.2;

    // RSI momentum direction
    const rsiMomentumUp = rsi > 50 && rsi < this.momConfig.rsi_overbought;
    const rsiMomentumDown = rsi < 50 && rsi > this.momConfig.rsi_oversold;

    // Calculate trend strength from EMA spread
    const emaSpread = currentSlow > 0 ? Math.abs(currentFast - currentSlow) / currentSlow * 100 : 0;

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.4;
    let reasoning = '';

    // Bullish momentum
    if (bullishCross && rsiMomentumUp && volumeConfirmed) {
      action = 'buy';
      confidence = 0.75;
      reasoning = `Bullish EMA crossover (${this.momConfig.fast_ema}/${this.momConfig.slow_ema}) confirmed. `;
      reasoning += `RSI ${rsi.toFixed(1)} with upward momentum. `;
      if (volumeConfirmed) reasoning += 'Volume above average confirms move. ';
    } else if (fastAboveSlow && rsiMomentumUp && emaSpread > 0.5) {
      action = 'buy';
      confidence = 0.6;
      reasoning = `Bullish momentum continuation: EMA spread ${emaSpread.toFixed(2)}%. `;
      reasoning += `RSI ${rsi.toFixed(1)} in bullish zone. `;
    }
    // Bearish momentum
    else if (bearishCross && rsiMomentumDown && volumeConfirmed) {
      action = 'sell';
      confidence = 0.75;
      reasoning = `Bearish EMA crossover (${this.momConfig.fast_ema}/${this.momConfig.slow_ema}) confirmed. `;
      reasoning += `RSI ${rsi.toFixed(1)} with downward momentum. `;
      if (volumeConfirmed) reasoning += 'Volume confirms sell-off. ';
    } else if (fastBelowSlow && rsiMomentumDown && emaSpread > 0.5) {
      action = 'sell';
      confidence = 0.6;
      reasoning = `Bearish momentum continuation: EMA spread ${emaSpread.toFixed(2)}%. `;
      reasoning += `RSI ${rsi.toFixed(1)} in bearish zone. `;
    } else {
      reasoning = `No clear momentum signal. Fast EMA ${currentFast.toFixed(2)}, Slow EMA ${currentSlow.toFixed(2)}, RSI ${rsi.toFixed(1)}.`;
    }

    // Boost confidence with additional confirmations
    if (action !== 'hold') {
      if (emaSpread > 1.0) confidence += 0.05;
      if (last.volume > avgVolume * 2) confidence += 0.05;
      if ((action === 'buy' && rsi > 55 && rsi < 65) || (action === 'sell' && rsi < 45 && rsi > 35)) {
        confidence += 0.05;
      }
    }

    confidence = Math.max(0.1, Math.min(0.95, confidence));

    const slDistance = atr * this.momConfig.atr_sl_multiplier;
    const tpDistance = atr * this.momConfig.atr_tp_multiplier;

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
