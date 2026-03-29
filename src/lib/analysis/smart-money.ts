// =============================================================================
// MIDAS — Smart Money Concepts (SMC)
// Order blocks, Fair Value Gaps, premium/discount zones
// =============================================================================

import type { Candle } from '@/lib/agents/types';

// --- Types ---

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  index: number;
  strength: number; // 0-1 based on volume and displacement
}

export interface FairValueGap {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  index: number;
  filled: boolean;
}

export interface SmartMoneyAnalysis {
  order_blocks: OrderBlock[];
  fair_value_gaps: FairValueGap[];
  premium_discount: 'premium' | 'discount' | 'equilibrium';
  range_high: number;
  range_low: number;
  equilibrium: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

// --- Order Block Detection ---

function detectOrderBlocks(candles: Candle[]): OrderBlock[] {
  const blocks: OrderBlock[] = [];
  if (candles.length < 5) return blocks;

  const avgVolume = candles.reduce((s, c) => s + c.volume, 0) / candles.length;

  for (let i = 2; i < candles.length - 2; i++) {
    const prev = candles[i - 1];
    const current = candles[i];
    const next = candles[i + 1];
    const afterNext = candles[i + 2];

    // Bullish order block: last bearish candle before a strong bullish move
    if (
      current.close < current.open && // Current is bearish
      next.close > next.open &&        // Next is bullish
      afterNext.close > afterNext.open && // Continuation bullish
      next.close > current.high &&     // Displacement above
      next.volume > avgVolume * 1.2
    ) {
      const displacement = (afterNext.close - current.low) / current.low;
      blocks.push({
        type: 'bullish',
        high: current.high,
        low: current.low,
        index: i,
        strength: Math.min(1, displacement * 10 + (next.volume / avgVolume - 1) * 0.3),
      });
    }

    // Bearish order block: last bullish candle before a strong bearish move
    if (
      current.close > current.open && // Current is bullish
      next.close < next.open &&        // Next is bearish
      afterNext.close < afterNext.open && // Continuation bearish
      next.close < current.low &&      // Displacement below
      next.volume > avgVolume * 1.2
    ) {
      const displacement = (current.high - afterNext.close) / current.high;
      blocks.push({
        type: 'bearish',
        high: current.high,
        low: current.low,
        index: i,
        strength: Math.min(1, displacement * 10 + (next.volume / avgVolume - 1) * 0.3),
      });
    }
  }

  // Return only recent blocks (last 10)
  return blocks.slice(-10);
}

// --- Fair Value Gap Detection ---

function detectFairValueGaps(candles: Candle[]): FairValueGap[] {
  const gaps: FairValueGap[] = [];
  if (candles.length < 3) return gaps;

  const currentPrice = candles[candles.length - 1].close;

  for (let i = 1; i < candles.length - 1; i++) {
    const first = candles[i - 1];
    const third = candles[i + 1];

    // Bullish FVG: gap between candle 1 high and candle 3 low (price jumped up)
    if (third.low > first.high) {
      const gapFilled = currentPrice <= first.high;
      gaps.push({
        type: 'bullish',
        top: third.low,
        bottom: first.high,
        index: i,
        filled: gapFilled,
      });
    }

    // Bearish FVG: gap between candle 3 high and candle 1 low (price dropped)
    if (third.high < first.low) {
      const gapFilled = currentPrice >= first.low;
      gaps.push({
        type: 'bearish',
        top: first.low,
        bottom: third.high,
        index: i,
        filled: gapFilled,
      });
    }
  }

  // Return only unfilled recent gaps
  return gaps.filter((g) => !g.filled).slice(-10);
}

// --- Main Analysis ---

export function analyzeSmartMoney(candles: Candle[]): SmartMoneyAnalysis {
  if (candles.length < 20) {
    return {
      order_blocks: [],
      fair_value_gaps: [],
      premium_discount: 'equilibrium',
      range_high: 0,
      range_low: 0,
      equilibrium: 0,
      signal: 'neutral',
      confidence: 0,
    };
  }

  const orderBlocks = detectOrderBlocks(candles);
  const fvgs = detectFairValueGaps(candles);

  // Calculate range for premium/discount zones
  const lookback = Math.min(50, candles.length);
  const recentCandles = candles.slice(-lookback);
  const rangeHigh = Math.max(...recentCandles.map((c) => c.high));
  const rangeLow = Math.min(...recentCandles.map((c) => c.low));
  const equilibrium = (rangeHigh + rangeLow) / 2;
  const currentPrice = candles[candles.length - 1].close;

  let premiumDiscount: 'premium' | 'discount' | 'equilibrium';
  const rangeSize = rangeHigh - rangeLow;
  const pricePosition = rangeSize > 0 ? (currentPrice - rangeLow) / rangeSize : 0.5;

  if (pricePosition > 0.7) premiumDiscount = 'premium';
  else if (pricePosition < 0.3) premiumDiscount = 'discount';
  else premiumDiscount = 'equilibrium';

  // Signal determination
  let score = 0;

  // Discount zone = potential buy, premium zone = potential sell
  if (premiumDiscount === 'discount') score += 1;
  else if (premiumDiscount === 'premium') score -= 1;

  // Nearby bullish order blocks = buy support
  const nearbyBullishOB = orderBlocks.filter(
    (ob) => ob.type === 'bullish' && currentPrice >= ob.low && currentPrice <= ob.high * 1.02
  );
  const nearbyBearishOB = orderBlocks.filter(
    (ob) => ob.type === 'bearish' && currentPrice <= ob.high && currentPrice >= ob.low * 0.98
  );

  if (nearbyBullishOB.length > 0) score += 1;
  if (nearbyBearishOB.length > 0) score -= 1;

  // Unfilled bullish FVGs below price = support
  const bullishFVGs = fvgs.filter((g) => g.type === 'bullish' && g.top < currentPrice);
  const bearishFVGs = fvgs.filter((g) => g.type === 'bearish' && g.bottom > currentPrice);

  if (bullishFVGs.length > bearishFVGs.length) score += 1;
  else if (bearishFVGs.length > bullishFVGs.length) score -= 1;

  let signal: 'bullish' | 'bearish' | 'neutral';
  if (score >= 2) signal = 'bullish';
  else if (score <= -2) signal = 'bearish';
  else signal = 'neutral';

  const confidence = Math.min(0.75, Math.abs(score) * 0.2 + orderBlocks.length * 0.02);

  return {
    order_blocks: orderBlocks,
    fair_value_gaps: fvgs,
    premium_discount: premiumDiscount,
    range_high: rangeHigh,
    range_low: rangeLow,
    equilibrium,
    signal,
    confidence,
  };
}
