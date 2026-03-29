// =============================================================================
// MIDAS — Dollar Cost Averaging Strategy
// Achats réguliers avec ajustement RSI et protection crash
// =============================================================================

import type { Candle } from '@/types/trading';
import { BaseStrategy, type StrategyConfig, type StrategySignal } from './base-strategy';

interface DCAConfig extends StrategyConfig {
  base_amount: number;
  interval_candles: number;
  rsi_oversold: number;
  rsi_overbought: number;
  crash_threshold_pct: number;
}

const DEFAULT_DCA_CONFIG: Omit<DCAConfig, keyof StrategyConfig> = {
  base_amount: 100,
  interval_candles: 24,
  rsi_oversold: 30,
  rsi_overbought: 70,
  crash_threshold_pct: -15,
};

export class DCAStrategy extends BaseStrategy {
  name = 'DCA (Dollar Cost Averaging)';
  private dcaConfig: DCAConfig;

  constructor(config: StrategyConfig, dcaOverrides?: Partial<Omit<DCAConfig, keyof StrategyConfig>>) {
    super(config);
    this.dcaConfig = {
      ...config,
      ...DEFAULT_DCA_CONFIG,
      ...dcaOverrides,
    };
  }

  async analyze(candles: Candle[], indicators: Record<string, unknown>): Promise<StrategySignal> {
    const lastCandle = this.getLastCandle(candles);
    const rsi = this.calculateRSI(candles, 14);

    const isCrashMode = this.detectCrashMode(candles);
    if (isCrashMode) {
      return {
        action: 'hold',
        confidence: 0.9,
        entry_price: lastCandle.close,
        stop_loss: 0,
        take_profit: 0,
        reasoning: `Crash détecté: chute >|${this.dcaConfig.crash_threshold_pct}%| sur les dernières bougies. DCA en pause pour éviter d'attraper un couteau qui tombe.`,
      };
    }

    const isDCAInterval = this.isDCAInterval(candles, indicators);
    if (!isDCAInterval) {
      return {
        action: 'hold',
        confidence: 0.5,
        entry_price: lastCandle.close,
        stop_loss: 0,
        take_profit: 0,
        reasoning: 'Pas encore le moment du prochain achat DCA. Attente de l\'intervalle programmé.',
      };
    }

    const amountMultiplier = this.calculateAmountMultiplier(rsi);
    const buyAmount = this.dcaConfig.base_amount * amountMultiplier;
    const atr = this.calculateATR(candles, 14);
    const stopLoss = lastCandle.close - atr * 3;
    const takeProfit = lastCandle.close + atr * 4;

    let reasoning = `Achat DCA programmé à ${lastCandle.close.toFixed(2)}.`;
    if (rsi < this.dcaConfig.rsi_oversold) {
      reasoning += ` RSI à ${rsi.toFixed(1)} (survendu) → montant majoré ×${amountMultiplier.toFixed(2)} (${buyAmount.toFixed(2)}$).`;
    } else if (rsi > this.dcaConfig.rsi_overbought) {
      reasoning += ` RSI à ${rsi.toFixed(1)} (suracheté) → montant réduit ×${amountMultiplier.toFixed(2)} (${buyAmount.toFixed(2)}$).`;
    } else {
      reasoning += ` RSI neutre à ${rsi.toFixed(1)} → montant standard (${buyAmount.toFixed(2)}$).`;
    }

    const confidence = this.calculateConfidence(rsi, amountMultiplier);

    return {
      action: 'buy',
      confidence,
      entry_price: lastCandle.close,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      reasoning,
    };
  }

  private detectCrashMode(candles: Candle[]): boolean {
    if (candles.length < 24) return false;

    const recent = candles.slice(-24);
    const startPrice = recent[0]?.close ?? 0;
    const endPrice = recent[recent.length - 1]?.close ?? 0;

    if (startPrice === 0) return false;

    const changePct = ((endPrice - startPrice) / startPrice) * 100;
    return changePct <= this.dcaConfig.crash_threshold_pct;
  }

  private isDCAInterval(candles: Candle[], indicators: Record<string, unknown>): boolean {
    const lastDCACandle = indicators['last_dca_candle_index'] as number | undefined;

    if (lastDCACandle === undefined) {
      return true;
    }

    return (candles.length - 1 - lastDCACandle) >= this.dcaConfig.interval_candles;
  }

  private calculateAmountMultiplier(rsi: number): number {
    if (rsi < 20) return 2.0;
    if (rsi < this.dcaConfig.rsi_oversold) return 1.5;
    if (rsi > 80) return 0.25;
    if (rsi > this.dcaConfig.rsi_overbought) return 0.5;
    return 1.0;
  }

  private calculateConfidence(rsi: number, multiplier: number): number {
    let base = 0.6;

    if (rsi < this.dcaConfig.rsi_oversold) {
      base += 0.15;
    }

    if (multiplier > 1) {
      base += 0.1;
    }

    return Math.min(base, 0.95);
  }
}
