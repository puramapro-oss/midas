// =============================================================================
// MIDAS — Patterns chartistes avancés (brief MIDAS-BRIEF-ULTIMATE.md)
// Head & Shoulders, Inverse H&S, Triangles, Flags, Pennants, Wedges, Cup & Handle.
// Basé sur les swing points et la regression linéaire des trendlines.
// =============================================================================

import type { Candle } from '@/lib/agents/types';

export type AdvancedPatternType =
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'bull_flag'
  | 'bear_flag'
  | 'pennant'
  | 'rising_wedge'
  | 'falling_wedge'
  | 'cup_and_handle';

export interface AdvancedPattern {
  type: AdvancedPatternType;
  signal: 'bullish' | 'bearish';
  confidence: number; // 0-1
  description: string;
  // Niveaux clés
  support?: number;
  resistance?: number;
  target?: number;
  stop?: number;
}

interface Swing {
  index: number;
  price: number;
  kind: 'high' | 'low';
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function findSwings(candles: Candle[], lookback = 5): Swing[] {
  const swings: Swing[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const cur = candles[i];
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= cur.high || candles[i + j].high >= cur.high) isHigh = false;
      if (candles[i - j].low <= cur.low || candles[i + j].low <= cur.low) isLow = false;
    }
    if (isHigh) swings.push({ index: i, price: cur.high, kind: 'high' });
    if (isLow) swings.push({ index: i, price: cur.low, kind: 'low' });
  }
  return swings;
}

function priceWithin(a: number, b: number, pct: number): boolean {
  if (a === 0) return false;
  return Math.abs(a - b) / a <= pct;
}

function linearRegressionSlope(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// -----------------------------------------------------------------------------
// Head & Shoulders (top) et Inverse (bottom)
// 5 swings : LS - H - HEAD - H - RS où head est l'extrême
// -----------------------------------------------------------------------------

function detectHeadAndShoulders(swings: Swing[]): AdvancedPattern | null {
  const highs = swings.filter((s) => s.kind === 'high');
  if (highs.length < 3) return null;
  const last3 = highs.slice(-3);
  const [ls, head, rs] = last3;
  // Head doit être le plus haut
  if (head.price <= ls.price || head.price <= rs.price) return null;
  // LS et RS doivent être ~ même hauteur (10%)
  if (!priceWithin(ls.price, rs.price, 0.10)) return null;

  // Neckline = swing low entre LS et RS
  const lowsBetween = swings.filter(
    (s) => s.kind === 'low' && s.index > ls.index && s.index < rs.index,
  );
  if (lowsBetween.length === 0) return null;
  const neckline = lowsBetween.reduce((a, b) => (a.price < b.price ? a : b)).price;
  const headHeight = head.price - neckline;
  const target = neckline - headHeight;

  return {
    type: 'head_and_shoulders',
    signal: 'bearish',
    confidence: 0.75,
    description: `H&S détecté — head ${head.price.toFixed(2)}, neckline ${neckline.toFixed(2)}`,
    resistance: head.price,
    support: neckline,
    target,
    stop: head.price * 1.01,
  };
}

function detectInverseHeadAndShoulders(swings: Swing[]): AdvancedPattern | null {
  const lows = swings.filter((s) => s.kind === 'low');
  if (lows.length < 3) return null;
  const last3 = lows.slice(-3);
  const [ls, head, rs] = last3;
  if (head.price >= ls.price || head.price >= rs.price) return null;
  if (!priceWithin(ls.price, rs.price, 0.10)) return null;

  const highsBetween = swings.filter(
    (s) => s.kind === 'high' && s.index > ls.index && s.index < rs.index,
  );
  if (highsBetween.length === 0) return null;
  const neckline = highsBetween.reduce((a, b) => (a.price > b.price ? a : b)).price;
  const headDepth = neckline - head.price;
  const target = neckline + headDepth;

  return {
    type: 'inverse_head_and_shoulders',
    signal: 'bullish',
    confidence: 0.75,
    description: `Inverse H&S — head ${head.price.toFixed(2)}, neckline ${neckline.toFixed(2)}`,
    support: head.price,
    resistance: neckline,
    target,
    stop: head.price * 0.99,
  };
}

// -----------------------------------------------------------------------------
// Triangles : ascending, descending, symmetrical
// -----------------------------------------------------------------------------

function detectTriangle(swings: Swing[]): AdvancedPattern | null {
  const recent = swings.slice(-8);
  const highs = recent.filter((s) => s.kind === 'high');
  const lows = recent.filter((s) => s.kind === 'low');
  if (highs.length < 2 || lows.length < 2) return null;

  const highSlope = linearRegressionSlope(highs.map((s) => ({ x: s.index, y: s.price })));
  const lowSlope = linearRegressionSlope(lows.map((s) => ({ x: s.index, y: s.price })));

  // Normaliser le slope par le prix moyen pour comparer
  const avgPrice = (recent.reduce((s, p) => s + p.price, 0) / recent.length) || 1;
  const highSlopeNorm = highSlope / avgPrice;
  const lowSlopeNorm = lowSlope / avgPrice;
  const FLAT = 0.0005;

  const lastHigh = highs[highs.length - 1].price;
  const lastLow = lows[lows.length - 1].price;

  // Ascending : highs flat, lows montent → bullish
  if (Math.abs(highSlopeNorm) < FLAT && lowSlopeNorm > FLAT) {
    const breakout = lastHigh;
    return {
      type: 'ascending_triangle',
      signal: 'bullish',
      confidence: 0.7,
      description: 'Triangle ascendant — résistance horizontale + plus bas montants',
      resistance: lastHigh,
      support: lastLow,
      target: breakout + (lastHigh - lastLow),
      stop: lastLow,
    };
  }

  // Descending : lows flat, highs descendent → bearish
  if (Math.abs(lowSlopeNorm) < FLAT && highSlopeNorm < -FLAT) {
    const breakdown = lastLow;
    return {
      type: 'descending_triangle',
      signal: 'bearish',
      confidence: 0.7,
      description: 'Triangle descendant — support horizontal + plus hauts descendants',
      resistance: lastHigh,
      support: lastLow,
      target: breakdown - (lastHigh - lastLow),
      stop: lastHigh,
    };
  }

  // Symmetrical : highs descendent, lows montent → continuation
  if (highSlopeNorm < -FLAT && lowSlopeNorm > FLAT) {
    return {
      type: 'symmetrical_triangle',
      signal: 'bullish', // par défaut continuation à la hausse, à confirmer par contexte
      confidence: 0.55,
      description: 'Triangle symétrique — convergence, breakout imminent',
      resistance: lastHigh,
      support: lastLow,
    };
  }

  return null;
}

// -----------------------------------------------------------------------------
// Flags & Pennants — consolidation après mouvement fort
// -----------------------------------------------------------------------------

function detectFlag(candles: Candle[]): AdvancedPattern | null {
  if (candles.length < 30) return null;
  const lookback = 20;
  const recent = candles.slice(-lookback);

  // Mouvement fort sur les 10 bougies précédentes
  const moveStart = candles[candles.length - lookback - 10];
  const moveEnd = candles[candles.length - lookback];
  if (!moveStart || !moveEnd) return null;
  const movePct = ((moveEnd.close - moveStart.close) / moveStart.close) * 100;

  // Range de consolidation
  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);
  const recentHigh = Math.max(...highs);
  const recentLow = Math.min(...lows);
  const rangePct = ((recentHigh - recentLow) / recentLow) * 100;

  // Flag = mouvement fort puis range étroit
  if (movePct > 8 && rangePct < movePct * 0.5) {
    // Bull flag
    return {
      type: 'bull_flag',
      signal: 'bullish',
      confidence: 0.65,
      description: `Bull flag — pump ${movePct.toFixed(1)}% puis consolidation ${rangePct.toFixed(1)}%`,
      support: recentLow,
      resistance: recentHigh,
      target: recentHigh + (moveEnd.close - moveStart.close),
      stop: recentLow,
    };
  }
  if (movePct < -8 && rangePct < Math.abs(movePct) * 0.5) {
    return {
      type: 'bear_flag',
      signal: 'bearish',
      confidence: 0.65,
      description: `Bear flag — dump ${movePct.toFixed(1)}% puis consolidation ${rangePct.toFixed(1)}%`,
      support: recentLow,
      resistance: recentHigh,
      target: recentLow - (moveStart.close - moveEnd.close),
      stop: recentHigh,
    };
  }
  return null;
}

function detectPennant(candles: Candle[], swings: Swing[]): AdvancedPattern | null {
  // Pennant = mouvement fort + petit triangle symétrique convergent
  if (candles.length < 30) return null;
  const moveStart = candles[candles.length - 25];
  const moveEnd = candles[candles.length - 10];
  if (!moveStart || !moveEnd) return null;
  const movePct = ((moveEnd.close - moveStart.close) / moveStart.close) * 100;
  if (Math.abs(movePct) < 6) return null;

  const tri = detectTriangle(swings.slice(-6));
  if (tri && tri.type === 'symmetrical_triangle') {
    return {
      type: 'pennant',
      signal: movePct > 0 ? 'bullish' : 'bearish',
      confidence: 0.6,
      description: `Pennant après mouvement ${movePct.toFixed(1)}%`,
      support: tri.support,
      resistance: tri.resistance,
    };
  }
  return null;
}

// -----------------------------------------------------------------------------
// Wedges — rising (bearish) / falling (bullish)
// Lignes parallèles convergentes inclinées dans le même sens
// -----------------------------------------------------------------------------

function detectWedge(swings: Swing[]): AdvancedPattern | null {
  const recent = swings.slice(-10);
  const highs = recent.filter((s) => s.kind === 'high');
  const lows = recent.filter((s) => s.kind === 'low');
  if (highs.length < 2 || lows.length < 2) return null;

  const highSlope = linearRegressionSlope(highs.map((s) => ({ x: s.index, y: s.price })));
  const lowSlope = linearRegressionSlope(lows.map((s) => ({ x: s.index, y: s.price })));
  const avgPrice = recent.reduce((s, p) => s + p.price, 0) / recent.length || 1;
  const highSlopeNorm = highSlope / avgPrice;
  const lowSlopeNorm = lowSlope / avgPrice;

  // Rising wedge : les deux montent mais lows montent plus vite (convergence) → bearish
  if (highSlopeNorm > 0.0003 && lowSlopeNorm > 0.0003 && lowSlopeNorm > highSlopeNorm) {
    return {
      type: 'rising_wedge',
      signal: 'bearish',
      confidence: 0.65,
      description: 'Rising wedge — pression vendeuse à venir',
      resistance: highs[highs.length - 1].price,
      support: lows[lows.length - 1].price,
    };
  }
  // Falling wedge : les deux descendent mais highs descendent plus vite → bullish
  if (highSlopeNorm < -0.0003 && lowSlopeNorm < -0.0003 && highSlopeNorm < lowSlopeNorm) {
    return {
      type: 'falling_wedge',
      signal: 'bullish',
      confidence: 0.65,
      description: 'Falling wedge — pression acheteuse à venir',
      resistance: highs[highs.length - 1].price,
      support: lows[lows.length - 1].price,
    };
  }
  return null;
}

// -----------------------------------------------------------------------------
// Cup & Handle — U-shape suivi d'une petite consolidation
// -----------------------------------------------------------------------------

function detectCupAndHandle(candles: Candle[]): AdvancedPattern | null {
  if (candles.length < 60) return null;
  const cupLen = 50;
  const handleLen = 10;
  const cup = candles.slice(-cupLen - handleLen, -handleLen);
  const handle = candles.slice(-handleLen);

  const cupStart = cup[0].close;
  const cupEnd = cup[cup.length - 1].close;
  const cupLow = Math.min(...cup.map((c) => c.low));
  const cupHigh = Math.max(...cup.map((c) => c.high));

  // Cup : start ~ end (rim), low en milieu
  if (!priceWithin(cupStart, cupEnd, 0.05)) return null;
  const cupLowIdx = cup.findIndex((c) => c.low === cupLow);
  if (cupLowIdx < cupLen * 0.25 || cupLowIdx > cupLen * 0.75) return null;
  const cupDepthPct = ((cupHigh - cupLow) / cupHigh) * 100;
  if (cupDepthPct < 10 || cupDepthPct > 50) return null;

  // Handle : petit pullback, ne casse pas sous le milieu de la cup
  const handleLow = Math.min(...handle.map((c) => c.low));
  const halfwayCup = (cupHigh + cupLow) / 2;
  if (handleLow < halfwayCup) return null;

  return {
    type: 'cup_and_handle',
    signal: 'bullish',
    confidence: 0.7,
    description: `Cup & Handle — profondeur ${cupDepthPct.toFixed(1)}%, breakout au-dessus de ${cupHigh.toFixed(2)}`,
    support: handleLow,
    resistance: cupHigh,
    target: cupHigh + (cupHigh - cupLow),
    stop: handleLow,
  };
}

// -----------------------------------------------------------------------------
// API publique
// -----------------------------------------------------------------------------

export function detectAdvancedPatterns(candles: Candle[]): AdvancedPattern[] {
  if (candles.length < 30) return [];
  const swings = findSwings(candles, 5);
  if (swings.length < 4) return [];

  const patterns: Array<AdvancedPattern | null> = [
    detectHeadAndShoulders(swings),
    detectInverseHeadAndShoulders(swings),
    detectTriangle(swings),
    detectFlag(candles),
    detectPennant(candles, swings),
    detectWedge(swings),
    detectCupAndHandle(candles),
  ];

  return patterns.filter((p): p is AdvancedPattern => p !== null);
}
