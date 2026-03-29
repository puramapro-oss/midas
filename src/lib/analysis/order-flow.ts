// =============================================================================
// MIDAS — Order Flow Analysis
// Bid/ask imbalance, large order detection, cumulative delta estimation
// Approximated from candle data (real order flow requires L2 WebSocket)
// =============================================================================

import type { Candle } from '@/lib/agents/types';

// --- Types ---

export interface OrderFlowAnalysis {
  bid_ask_imbalance: number; // -1 to 1 (negative = sell pressure, positive = buy pressure)
  large_order_detected: boolean;
  large_order_direction: 'buy' | 'sell' | 'none';
  cumulative_delta: number[];
  delta_trend: 'rising' | 'falling' | 'flat';
  absorption_detected: boolean;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

// --- Helpers ---

/**
 * Estimate buying/selling volume from a candle using the close position within the range.
 * If close is near the high, most volume is estimated as buying.
 */
function estimateBuySellVolume(candle: Candle): { buyVolume: number; sellVolume: number } {
  const range = candle.high - candle.low;
  if (range === 0) {
    return { buyVolume: candle.volume / 2, sellVolume: candle.volume / 2 };
  }

  const buyRatio = (candle.close - candle.low) / range;
  const buyVolume = candle.volume * buyRatio;
  const sellVolume = candle.volume * (1 - buyRatio);

  return { buyVolume, sellVolume };
}

// --- Main Analysis ---

export function analyzeOrderFlow(candles: Candle[]): OrderFlowAnalysis {
  if (candles.length < 20) {
    return {
      bid_ask_imbalance: 0,
      large_order_detected: false,
      large_order_direction: 'none',
      cumulative_delta: [],
      delta_trend: 'flat',
      absorption_detected: false,
      signal: 'neutral',
      confidence: 0,
    };
  }

  // Calculate cumulative delta
  const cumulativeDelta: number[] = [];
  let runningDelta = 0;

  for (const candle of candles) {
    const { buyVolume, sellVolume } = estimateBuySellVolume(candle);
    runningDelta += buyVolume - sellVolume;
    cumulativeDelta.push(runningDelta);
  }

  // Recent bid/ask imbalance (last 10 candles)
  const recentCandles = candles.slice(-10);
  let totalBuy = 0;
  let totalSell = 0;

  for (const c of recentCandles) {
    const { buyVolume, sellVolume } = estimateBuySellVolume(c);
    totalBuy += buyVolume;
    totalSell += sellVolume;
  }

  const totalVol = totalBuy + totalSell;
  const bidAskImbalance = totalVol !== 0 ? (totalBuy - totalSell) / totalVol : 0;

  // Detect large orders: volume > 3x average
  const avgVolume = candles.reduce((s, c) => s + c.volume, 0) / candles.length;
  const lastCandle = candles[candles.length - 1];
  const largeOrderDetected = lastCandle.volume > avgVolume * 3;
  let largeOrderDirection: 'buy' | 'sell' | 'none' = 'none';

  if (largeOrderDetected) {
    const { buyVolume, sellVolume } = estimateBuySellVolume(lastCandle);
    largeOrderDirection = buyVolume > sellVolume ? 'buy' : 'sell';
  }

  // Delta trend (last 10 values)
  const recentDelta = cumulativeDelta.slice(-10);
  let deltaTrend: 'rising' | 'falling' | 'flat' = 'flat';

  if (recentDelta.length >= 5) {
    const firstHalf = recentDelta.slice(0, 5).reduce((s, v) => s + v, 0) / 5;
    const secondHalf = recentDelta.slice(-5).reduce((s, v) => s + v, 0) / 5;
    const change = secondHalf - firstHalf;
    const threshold = Math.abs(firstHalf) * 0.05;

    if (change > threshold) deltaTrend = 'rising';
    else if (change < -threshold) deltaTrend = 'falling';
  }

  // Absorption detection: price barely moves despite high volume
  const absorptionDetected = (() => {
    if (candles.length < 5) return false;
    const last5 = candles.slice(-5);
    const avgVol5 = last5.reduce((s, c) => s + c.volume, 0) / 5;
    const priceChange = Math.abs(last5[4].close - last5[0].open);
    const avgRange = last5.reduce((s, c) => s + (c.high - c.low), 0) / 5;

    return avgVol5 > avgVolume * 2 && priceChange < avgRange * 0.3;
  })();

  // Signal
  let score = 0;
  if (bidAskImbalance > 0.2) score += 1;
  else if (bidAskImbalance < -0.2) score -= 1;

  if (deltaTrend === 'rising') score += 1;
  else if (deltaTrend === 'falling') score -= 1;

  if (largeOrderDetected) {
    if (largeOrderDirection === 'buy') score += 1;
    else if (largeOrderDirection === 'sell') score -= 1;
  }

  let signal: 'bullish' | 'bearish' | 'neutral';
  if (score >= 2) signal = 'bullish';
  else if (score <= -2) signal = 'bearish';
  else signal = 'neutral';

  const confidence = Math.min(0.7, Math.abs(score) * 0.2 + (absorptionDetected ? 0.1 : 0));

  return {
    bid_ask_imbalance: Math.round(bidAskImbalance * 1000) / 1000,
    large_order_detected: largeOrderDetected,
    large_order_direction: largeOrderDirection,
    cumulative_delta: cumulativeDelta,
    delta_trend: deltaTrend,
    absorption_detected: absorptionDetected,
    signal,
    confidence,
  };
}
