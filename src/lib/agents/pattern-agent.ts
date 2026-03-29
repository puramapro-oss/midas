// =============================================================================
// MIDAS — Pattern Detection Agent
// Detecte les patterns de base (double top/bottom, support/resistance)
// a partir des swing points
// =============================================================================

import type { AgentResult, Candle } from '@/lib/agents/types';

// --- Types ---

type PatternType =
  | 'double_top'
  | 'double_bottom'
  | 'higher_high'
  | 'lower_low'
  | 'higher_low'
  | 'lower_high'
  | 'support_test'
  | 'resistance_test'
  | 'breakout_up'
  | 'breakout_down';

interface DetectedPattern {
  type: PatternType;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  price_level: number;
  description: string;
}

interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  timestamp: number;
}

interface SupportResistance {
  level: number;
  type: 'support' | 'resistance';
  touches: number;
  strength: number;
}

interface PatternData {
  patterns: DetectedPattern[];
  swing_highs: Array<{ price: number; timestamp: number }>;
  swing_lows: Array<{ price: number; timestamp: number }>;
  support_levels: SupportResistance[];
  resistance_levels: SupportResistance[];
  market_structure: 'bullish' | 'bearish' | 'neutral';
}

// --- Constants ---

const SWING_LOOKBACK = 5;
const PRICE_TOLERANCE_PCT = 0.015; // 1.5% pour considerer deux niveaux comme egaux
const MIN_PATTERN_STRENGTH = 0.3;
const LEVEL_CLUSTER_PCT = 0.02; // 2% pour regrouper les niveaux S/R

// --- Swing Point Detection ---

function detectSwingPoints(candles: Candle[], lookback: number): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high >= currentHigh) {
        isSwingHigh = false;
      }
      if (candles[i - j].low <= currentLow || candles[i + j].low <= currentLow) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      swings.push({
        index: i,
        price: currentHigh,
        type: 'high',
        timestamp: candles[i].timestamp,
      });
    }

    if (isSwingLow) {
      swings.push({
        index: i,
        price: currentLow,
        type: 'low',
        timestamp: candles[i].timestamp,
      });
    }
  }

  return swings.sort((a, b) => a.index - b.index);
}

// --- Support/Resistance Detection ---

function detectSupportResistance(swings: SwingPoint[], currentPrice: number): SupportResistance[] {
  if (swings.length < 2) return [];

  // Cluster nearby swing points into levels
  const levels: SupportResistance[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < swings.length; i++) {
    if (usedIndices.has(i)) continue;

    const cluster: SwingPoint[] = [swings[i]];
    usedIndices.add(i);

    for (let j = i + 1; j < swings.length; j++) {
      if (usedIndices.has(j)) continue;

      const priceDiff = Math.abs(swings[i].price - swings[j].price) / swings[i].price;
      if (priceDiff <= LEVEL_CLUSTER_PCT) {
        cluster.push(swings[j]);
        usedIndices.add(j);
      }
    }

    if (cluster.length >= 2) {
      const avgPrice = cluster.reduce((sum, s) => sum + s.price, 0) / cluster.length;
      const type: 'support' | 'resistance' = avgPrice < currentPrice ? 'support' : 'resistance';
      const strength = Math.min(1.0, cluster.length * 0.25);

      levels.push({
        level: avgPrice,
        type,
        touches: cluster.length,
        strength,
      });
    }
  }

  return levels.sort((a, b) => b.strength - a.strength);
}

// --- Pattern Detection ---

function arePricesEqual(a: number, b: number): boolean {
  return Math.abs(a - b) / a <= PRICE_TOLERANCE_PCT;
}

function detectPatterns(
  swings: SwingPoint[],
  currentPrice: number,
  supports: SupportResistance[],
  resistances: SupportResistance[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const swingHighs = swings.filter((s) => s.type === 'high');
  const swingLows = swings.filter((s) => s.type === 'low');

  // --- Double Top ---
  if (swingHighs.length >= 2) {
    const last = swingHighs[swingHighs.length - 1];
    const prev = swingHighs[swingHighs.length - 2];

    if (arePricesEqual(last.price, prev.price) && currentPrice < last.price) {
      patterns.push({
        type: 'double_top',
        signal: 'bearish',
        strength: 0.75,
        price_level: (last.price + prev.price) / 2,
        description: `Double top detecte a ${last.price.toFixed(2)} — potentiel retournement baissier`,
      });
    }
  }

  // --- Double Bottom ---
  if (swingLows.length >= 2) {
    const last = swingLows[swingLows.length - 1];
    const prev = swingLows[swingLows.length - 2];

    if (arePricesEqual(last.price, prev.price) && currentPrice > last.price) {
      patterns.push({
        type: 'double_bottom',
        signal: 'bullish',
        strength: 0.75,
        price_level: (last.price + prev.price) / 2,
        description: `Double bottom detecte a ${last.price.toFixed(2)} — potentiel retournement haussier`,
      });
    }
  }

  // --- Higher Highs / Lower Lows (Market Structure) ---
  if (swingHighs.length >= 2) {
    const lastH = swingHighs[swingHighs.length - 1];
    const prevH = swingHighs[swingHighs.length - 2];

    if (lastH.price > prevH.price) {
      patterns.push({
        type: 'higher_high',
        signal: 'bullish',
        strength: 0.5,
        price_level: lastH.price,
        description: `Higher high: ${prevH.price.toFixed(2)} → ${lastH.price.toFixed(2)}`,
      });
    } else if (lastH.price < prevH.price) {
      patterns.push({
        type: 'lower_high',
        signal: 'bearish',
        strength: 0.5,
        price_level: lastH.price,
        description: `Lower high: ${prevH.price.toFixed(2)} → ${lastH.price.toFixed(2)}`,
      });
    }
  }

  if (swingLows.length >= 2) {
    const lastL = swingLows[swingLows.length - 1];
    const prevL = swingLows[swingLows.length - 2];

    if (lastL.price > prevL.price) {
      patterns.push({
        type: 'higher_low',
        signal: 'bullish',
        strength: 0.5,
        price_level: lastL.price,
        description: `Higher low: ${prevL.price.toFixed(2)} → ${lastL.price.toFixed(2)}`,
      });
    } else if (lastL.price < prevL.price) {
      patterns.push({
        type: 'lower_low',
        signal: 'bearish',
        strength: 0.5,
        price_level: lastL.price,
        description: `Lower low: ${prevL.price.toFixed(2)} → ${lastL.price.toFixed(2)}`,
      });
    }
  }

  // --- Support/Resistance Tests ---
  for (const support of supports.slice(0, 3)) {
    const distancePct = Math.abs(currentPrice - support.level) / support.level;
    if (distancePct < 0.02) {
      patterns.push({
        type: 'support_test',
        signal: 'bullish',
        strength: support.strength * 0.8,
        price_level: support.level,
        description: `Test du support ${support.level.toFixed(2)} (${support.touches} touches)`,
      });
    }
    if (currentPrice < support.level * (1 - PRICE_TOLERANCE_PCT * 2)) {
      patterns.push({
        type: 'breakout_down',
        signal: 'bearish',
        strength: support.strength * 0.9,
        price_level: support.level,
        description: `Cassure du support ${support.level.toFixed(2)} — baissier`,
      });
    }
  }

  for (const resistance of resistances.slice(0, 3)) {
    const distancePct = Math.abs(currentPrice - resistance.level) / resistance.level;
    if (distancePct < 0.02) {
      patterns.push({
        type: 'resistance_test',
        signal: 'bearish',
        strength: resistance.strength * 0.8,
        price_level: resistance.level,
        description: `Test de la resistance ${resistance.level.toFixed(2)} (${resistance.touches} touches)`,
      });
    }
    if (currentPrice > resistance.level * (1 + PRICE_TOLERANCE_PCT * 2)) {
      patterns.push({
        type: 'breakout_up',
        signal: 'bullish',
        strength: resistance.strength * 0.9,
        price_level: resistance.level,
        description: `Cassure de la resistance ${resistance.level.toFixed(2)} — haussier`,
      });
    }
  }

  return patterns.filter((p) => p.strength >= MIN_PATTERN_STRENGTH);
}

// --- Market Structure ---

function determineMarketStructure(patterns: DetectedPattern[]): 'bullish' | 'bearish' | 'neutral' {
  let bullishWeight = 0;
  let bearishWeight = 0;

  for (const pattern of patterns) {
    if (pattern.signal === 'bullish') {
      bullishWeight += pattern.strength;
    } else if (pattern.signal === 'bearish') {
      bearishWeight += pattern.strength;
    }
  }

  const diff = bullishWeight - bearishWeight;
  if (diff > 0.3) return 'bullish';
  if (diff < -0.3) return 'bearish';
  return 'neutral';
}

// --- Main Agent Function ---

/**
 * Detecte les patterns de prix basiques et les niveaux de support/resistance.
 * Necessite au minimum 50 candles.
 */
export async function analyzePatterns(
  pair: string,
  candles: Candle[]
): Promise<AgentResult> {
  if (candles.length < 50) {
    return {
      agent_name: 'pattern',
      signal: 'neutral',
      score: 0,
      confidence: 0,
      reasoning: `Donnees insuffisantes: ${candles.length} candles fournies, minimum 50 requises`,
      data: { error: 'insufficient_data', candle_count: candles.length },
      timestamp: new Date(),
    };
  }

  const currentPrice = candles[candles.length - 1].close;

  // Detect swing points
  const swings = detectSwingPoints(candles, SWING_LOOKBACK);
  const swingHighs = swings.filter((s) => s.type === 'high');
  const swingLows = swings.filter((s) => s.type === 'low');

  // Detect support/resistance
  const allLevels = detectSupportResistance(swings, currentPrice);
  const supportLevels = allLevels.filter((l) => l.type === 'support');
  const resistanceLevels = allLevels.filter((l) => l.type === 'resistance');

  // Detect patterns
  const detectedPatterns = detectPatterns(swings, currentPrice, supportLevels, resistanceLevels);

  // Market structure
  const structure = determineMarketStructure(detectedPatterns);

  // Composite score
  let totalScore = 0;
  let totalWeight = 0;

  for (const pattern of detectedPatterns) {
    const weight = pattern.strength;
    const signalValue = pattern.signal === 'bullish' ? 1 : pattern.signal === 'bearish' ? -1 : 0;
    totalScore += signalValue * weight;
    totalWeight += weight;
  }

  const compositeScore = totalWeight > 0
    ? Math.max(-1, Math.min(1, totalScore / totalWeight))
    : 0;

  // Signal
  let signal: AgentResult['signal'];
  if (compositeScore > 0.15) {
    signal = 'bullish';
  } else if (compositeScore < -0.15) {
    signal = 'bearish';
  } else {
    signal = 'neutral';
  }

  // Confidence
  const patternCount = detectedPatterns.length;
  const confidence = Math.min(0.8, 0.2 + patternCount * 0.1 + (swings.length > 10 ? 0.15 : 0));

  // Reasoning
  const reasoningParts = [
    `Patterns ${pair} — Structure: ${structure.toUpperCase()}`,
    `${swingHighs.length} swing highs, ${swingLows.length} swing lows detectes`,
    `${supportLevels.length} supports, ${resistanceLevels.length} resistances`,
  ];

  for (const pattern of detectedPatterns.slice(0, 5)) {
    reasoningParts.push(`[${pattern.type}] ${pattern.description} (force: ${pattern.strength.toFixed(2)})`);
  }

  if (supportLevels.length > 0) {
    reasoningParts.push(`Support principal: ${supportLevels[0].level.toFixed(2)} (${supportLevels[0].touches} touches)`);
  }
  if (resistanceLevels.length > 0) {
    reasoningParts.push(`Resistance principale: ${resistanceLevels[0].level.toFixed(2)} (${resistanceLevels[0].touches} touches)`);
  }

  const patternData: PatternData = {
    patterns: detectedPatterns,
    swing_highs: swingHighs.slice(-10).map((s) => ({ price: s.price, timestamp: s.timestamp })),
    swing_lows: swingLows.slice(-10).map((s) => ({ price: s.price, timestamp: s.timestamp })),
    support_levels: supportLevels.slice(0, 5),
    resistance_levels: resistanceLevels.slice(0, 5),
    market_structure: structure,
  };

  return {
    agent_name: 'pattern',
    signal,
    score: compositeScore,
    confidence,
    reasoning: reasoningParts.join('\n'),
    data: patternData as unknown as Record<string, unknown>,
    timestamp: new Date(),
  };
}
