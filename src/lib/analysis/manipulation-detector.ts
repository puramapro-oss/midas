// =============================================================================
// MIDAS — Market Manipulation Detector
// Wash trading, pump & dump, stop hunt, fake breakout detection
// =============================================================================

import type { Candle } from '@/lib/agents/types';

// --- Types ---

export type ManipulationType = 'wash_trading' | 'pump_and_dump' | 'stop_hunt' | 'fake_breakout';

export interface ManipulationEvent {
  type: ManipulationType;
  severity: 'low' | 'medium' | 'high';
  index: number;
  description: string;
  confidence: number;
}

export interface ManipulationDetection {
  events: ManipulationEvent[];
  wash_trading_risk: number;    // 0-1
  pump_dump_risk: number;       // 0-1
  stop_hunt_detected: boolean;
  fake_breakout_detected: boolean;
  overall_risk: 'clean' | 'suspicious' | 'likely_manipulated';
  recommendation: string;
}

// --- Helpers ---

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  const avg = average(arr);
  const variance = arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// --- Wash Trading Detection ---

function detectWashTrading(candles: Candle[]): { risk: number; events: ManipulationEvent[] } {
  const events: ManipulationEvent[] = [];
  if (candles.length < 20) return { risk: 0, events };

  const volumes = candles.map((c) => c.volume);
  const avgVolume = average(volumes);
  let suspiciousCount = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const priceChange = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const bodyRatio = range > 0 ? priceChange / range : 0;

    // Wash trading indicator: very high volume but minimal price movement
    if (
      c.volume > avgVolume * 2 &&
      bodyRatio < 0.1 &&
      range / c.close < 0.002 // Less than 0.2% range
    ) {
      suspiciousCount++;
      if (c.volume > avgVolume * 4) {
        events.push({
          type: 'wash_trading',
          severity: c.volume > avgVolume * 6 ? 'high' : 'medium',
          index: i,
          description: `Volume ${(c.volume / avgVolume).toFixed(1)}x la moyenne avec mouvement <0.2%`,
          confidence: Math.min(0.8, (c.volume / avgVolume) * 0.1),
        });
      }
    }
  }

  const risk = Math.min(1, suspiciousCount / candles.length * 5);
  return { risk, events };
}

// --- Pump & Dump Detection ---

function detectPumpAndDump(candles: Candle[]): { risk: number; events: ManipulationEvent[] } {
  const events: ManipulationEvent[] = [];
  if (candles.length < 10) return { risk: 0, events };

  const volumes = candles.map((c) => c.volume);
  const avgVolume = average(volumes);
  let maxRisk = 0;

  for (let i = 2; i < candles.length - 2; i++) {
    const window = candles.slice(Math.max(0, i - 2), i + 3);

    // Pump phase: sudden volume spike + rapid price increase
    const pumpCandles = window.filter((c) => c.close > c.open && c.volume > avgVolume * 3);

    if (pumpCandles.length >= 2) {
      const priceIncrease = (window[window.length - 1].close - window[0].open) / window[0].open;
      const volumeSpike = Math.max(...window.map((c) => c.volume)) / avgVolume;

      // Check for immediate dump after pump
      if (i + 2 < candles.length) {
        const afterPump = candles.slice(i + 1, Math.min(i + 4, candles.length));
        const dumpDetected = afterPump.some(
          (c) => c.close < c.open && (c.open - c.close) / c.open > priceIncrease * 0.5
        );

        if (priceIncrease > 0.05 && volumeSpike > 5 && dumpDetected) {
          const severity: 'low' | 'medium' | 'high' =
            priceIncrease > 0.15 ? 'high' : priceIncrease > 0.08 ? 'medium' : 'low';

          events.push({
            type: 'pump_and_dump',
            severity,
            index: i,
            description: `Hausse de ${(priceIncrease * 100).toFixed(1)}% avec volume ${volumeSpike.toFixed(1)}x suivie d'une chute`,
            confidence: Math.min(0.85, 0.4 + priceIncrease * 2 + (dumpDetected ? 0.2 : 0)),
          });

          maxRisk = Math.max(maxRisk, severity === 'high' ? 0.9 : severity === 'medium' ? 0.6 : 0.3);
        }
      }
    }
  }

  return { risk: maxRisk, events };
}

// --- Stop Hunt Detection ---

function detectStopHunts(candles: Candle[]): ManipulationEvent[] {
  const events: ManipulationEvent[] = [];
  if (candles.length < 20) return events;

  for (let i = 10; i < candles.length - 1; i++) {
    const lookback = candles.slice(Math.max(0, i - 20), i);
    const recentLow = Math.min(...lookback.map((c) => c.low));
    const recentHigh = Math.max(...lookback.map((c) => c.high));
    const current = candles[i];
    const next = candles[i + 1];

    // Downside stop hunt: price pierces below recent support then reverses
    if (
      current.low < recentLow &&
      current.close > recentLow &&
      next.close > current.close
    ) {
      const penetration = (recentLow - current.low) / recentLow;
      const recovery = (current.close - current.low) / (current.high - current.low);

      if (penetration < 0.03 && recovery > 0.6) {
        events.push({
          type: 'stop_hunt',
          severity: penetration > 0.015 ? 'medium' : 'low',
          index: i,
          description: `Stop hunt baissier: penetration de ${(penetration * 100).toFixed(2)}% sous le support puis reversal`,
          confidence: Math.min(0.75, 0.4 + recovery * 0.3),
        });
      }
    }

    // Upside stop hunt: price pierces above resistance then reverses
    if (
      current.high > recentHigh &&
      current.close < recentHigh &&
      next.close < current.close
    ) {
      const penetration = (current.high - recentHigh) / recentHigh;
      const recovery = (current.high - current.close) / (current.high - current.low);

      if (penetration < 0.03 && recovery > 0.6) {
        events.push({
          type: 'stop_hunt',
          severity: penetration > 0.015 ? 'medium' : 'low',
          index: i,
          description: `Stop hunt haussier: penetration de ${(penetration * 100).toFixed(2)}% au-dessus de la resistance puis reversal`,
          confidence: Math.min(0.75, 0.4 + recovery * 0.3),
        });
      }
    }
  }

  return events.slice(-5);
}

// --- Fake Breakout Detection ---

function detectFakeBreakouts(candles: Candle[]): ManipulationEvent[] {
  const events: ManipulationEvent[] = [];
  if (candles.length < 25) return events;

  const volumes = candles.map((c) => c.volume);
  const avgVolume = average(volumes);

  for (let i = 15; i < candles.length - 2; i++) {
    const lookback = candles.slice(i - 15, i);
    const rangeHigh = Math.max(...lookback.map((c) => c.high));
    const rangeLow = Math.min(...lookback.map((c) => c.low));

    const current = candles[i];
    const next = candles[i + 1];
    const afterNext = candles[i + 2];

    // Fake breakout above: breaks resistance but no volume, then falls back
    if (
      current.close > rangeHigh &&
      current.volume < avgVolume * 1.2 && // No volume confirmation
      next.close < rangeHigh &&
      afterNext.close < next.close
    ) {
      events.push({
        type: 'fake_breakout',
        severity: 'medium',
        index: i,
        description: `Faux breakout haussier: cassure de ${rangeHigh.toFixed(2)} sans volume puis reintegration`,
        confidence: Math.min(0.7, 0.4 + (1 - current.volume / avgVolume) * 0.3),
      });
    }

    // Fake breakout below: breaks support but no volume, then rises back
    if (
      current.close < rangeLow &&
      current.volume < avgVolume * 1.2 &&
      next.close > rangeLow &&
      afterNext.close > next.close
    ) {
      events.push({
        type: 'fake_breakout',
        severity: 'medium',
        index: i,
        description: `Faux breakout baissier: cassure de ${rangeLow.toFixed(2)} sans volume puis reintegration`,
        confidence: Math.min(0.7, 0.4 + (1 - current.volume / avgVolume) * 0.3),
      });
    }
  }

  return events.slice(-5);
}

// --- Main Detection ---

export function detectManipulation(candles: Candle[]): ManipulationDetection {
  if (candles.length < 25) {
    return {
      events: [],
      wash_trading_risk: 0,
      pump_dump_risk: 0,
      stop_hunt_detected: false,
      fake_breakout_detected: false,
      overall_risk: 'clean',
      recommendation: 'Donnees insuffisantes pour une analyse fiable',
    };
  }

  const washResult = detectWashTrading(candles);
  const pumpResult = detectPumpAndDump(candles);
  const stopHuntEvents = detectStopHunts(candles);
  const fakeBreakoutEvents = detectFakeBreakouts(candles);

  const allEvents = [
    ...washResult.events,
    ...pumpResult.events,
    ...stopHuntEvents,
    ...fakeBreakoutEvents,
  ].sort((a, b) => b.confidence - a.confidence);

  const stopHuntDetected = stopHuntEvents.length > 0;
  const fakeBreakoutDetected = fakeBreakoutEvents.length > 0;

  // Overall risk assessment
  const highSeverityCount = allEvents.filter((e) => e.severity === 'high').length;
  const mediumSeverityCount = allEvents.filter((e) => e.severity === 'medium').length;
  const riskScore = highSeverityCount * 3 + mediumSeverityCount * 1.5 + allEvents.length * 0.5
    + washResult.risk * 5 + pumpResult.risk * 5;

  let overallRisk: 'clean' | 'suspicious' | 'likely_manipulated';
  if (riskScore > 8) overallRisk = 'likely_manipulated';
  else if (riskScore > 3) overallRisk = 'suspicious';
  else overallRisk = 'clean';

  let recommendation: string;
  if (overallRisk === 'likely_manipulated') {
    recommendation = 'Manipulation probable detectee. Eviter de trader ce marche ou reduire fortement la taille de position.';
  } else if (overallRisk === 'suspicious') {
    recommendation = 'Activite suspecte detectee. Utiliser des stop-loss plus larges et reduire l\'exposition.';
  } else if (stopHuntDetected || fakeBreakoutDetected) {
    recommendation = 'Quelques signaux de manipulation mineure. Attendre la confirmation avant d\'entrer en position.';
  } else {
    recommendation = 'Marche propre, pas de manipulation significative detectee.';
  }

  return {
    events: allEvents,
    wash_trading_risk: Math.round(washResult.risk * 100) / 100,
    pump_dump_risk: Math.round(pumpResult.risk * 100) / 100,
    stop_hunt_detected: stopHuntDetected,
    fake_breakout_detected: fakeBreakoutDetected,
    overall_risk: overallRisk,
    recommendation,
  };
}
