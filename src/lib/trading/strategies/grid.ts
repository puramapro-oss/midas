// =============================================================================
// MIDAS — Grid Trading Strategy
// Places buy/sell orders at regular intervals within a price range
// =============================================================================

import type { Candle } from '@/types/trading';
import { BaseStrategy, type StrategyConfig, type StrategySignal } from './base-strategy';

interface GridConfig extends StrategyConfig {
  grid_levels: number;
  range_pct: number; // Total range as % of current price
  bias: 'neutral' | 'bullish' | 'bearish';
}

const DEFAULT_GRID: Omit<GridConfig, keyof StrategyConfig> = {
  grid_levels: 10,
  range_pct: 6,
  bias: 'neutral',
};

export class GridStrategy extends BaseStrategy {
  name = 'Grid Trading';
  private gridConfig: GridConfig;

  constructor(config: StrategyConfig, overrides?: Partial<Omit<GridConfig, keyof StrategyConfig>>) {
    super(config);
    this.gridConfig = { ...config, ...DEFAULT_GRID, ...overrides };
  }

  async analyze(candles: Candle[], _indicators: Record<string, unknown>): Promise<StrategySignal> {
    const last = this.getLastCandle(candles);
    const price = last.close;

    // Calculate grid boundaries
    const halfRange = (this.gridConfig.range_pct / 2) / 100;
    const upperBound = price * (1 + halfRange);
    const lowerBound = price * (1 - halfRange);

    // Calculate Bollinger Bands for dynamic range
    const bb = this.calculateBollingerBands(candles, 20, 2);
    const rsi = this.calculateRSI(candles, 14);
    const atr = this.calculateATR(candles, 14);
    const avgVolume = this.calculateAverageVolume(candles, 20);
    const currentVolume = last.volume;

    // Determine if price is near grid buy or sell zone
    const positionInRange = (price - lowerBound) / (upperBound - lowerBound);
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;

    // Grid logic: buy near bottom of range, sell near top
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;
    let reasoning = '';

    const nearLowerBand = price <= bb.lower * 1.005;
    const nearUpperBand = price >= bb.upper * 0.995;

    if (positionInRange <= 0.3 || nearLowerBand) {
      // Bottom third of grid — buy zone
      action = 'buy';
      confidence = 0.55 + (1 - positionInRange) * 0.2;

      if (rsi < 35) confidence += 0.1;
      if (volumeRatio > 1.5) confidence += 0.05;

      reasoning = `Grid buy zone: price at ${(positionInRange * 100).toFixed(1)}% of range. `;
      reasoning += `RSI ${rsi.toFixed(1)}, BB lower ${bb.lower.toFixed(2)}. `;
      if (nearLowerBand) reasoning += 'Near lower Bollinger Band. ';
    } else if (positionInRange >= 0.7 || nearUpperBand) {
      // Top third of grid — sell zone
      action = 'sell';
      confidence = 0.55 + positionInRange * 0.2;

      if (rsi > 65) confidence += 0.1;
      if (volumeRatio > 1.5) confidence += 0.05;

      reasoning = `Grid sell zone: price at ${(positionInRange * 100).toFixed(1)}% of range. `;
      reasoning += `RSI ${rsi.toFixed(1)}, BB upper ${bb.upper.toFixed(2)}. `;
      if (nearUpperBand) reasoning += 'Near upper Bollinger Band. ';
    } else {
      reasoning = `Price in middle of grid range (${(positionInRange * 100).toFixed(1)}%). Waiting for extremes.`;
    }

    // Apply bias
    if (this.gridConfig.bias === 'bullish' && action === 'sell') {
      confidence -= 0.1;
    } else if (this.gridConfig.bias === 'bearish' && action === 'buy') {
      confidence -= 0.1;
    }

    confidence = Math.max(0.1, Math.min(0.95, confidence));

    // Stop loss and take profit based on ATR
    const stopDistance = atr * 2;
    const tpDistance = atr * 1.5;

    const stopLoss = action === 'buy' ? price - stopDistance : price + stopDistance;
    const takeProfit = action === 'buy' ? price + tpDistance : price - tpDistance;

    return {
      action,
      confidence,
      entry_price: price,
      stop_loss: action === 'hold' ? 0 : stopLoss,
      take_profit: action === 'hold' ? 0 : takeProfit,
      reasoning,
    };
  }
}
