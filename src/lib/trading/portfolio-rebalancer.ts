// =============================================================================
// MIDAS — Portfolio Rebalancer
// Calcul de reequilibrage de portefeuille avec contraintes de risque
// =============================================================================

const MAX_SINGLE_ASSET_PCT = 20;
const REBALANCE_THRESHOLD_PCT = 5;

export interface PortfolioAllocation {
  pair: string;
  targetPct: number;
  currentPct: number;
  action: 'increase' | 'decrease' | 'hold';
  reason: string;
}

interface PositionInput {
  pair: string;
  value: number;
}

interface SignalInput {
  pair: string;
  score: number;
}

// Simplified correlation matrix for major crypto pairs
const CORRELATION_PAIRS: Record<string, string[]> = {
  'BTC/USDT': ['ETH/USDT', 'SOL/USDT', 'AVAX/USDT'],
  'ETH/USDT': ['BTC/USDT', 'SOL/USDT', 'MATIC/USDT', 'AVAX/USDT'],
  'SOL/USDT': ['ETH/USDT', 'AVAX/USDT', 'BTC/USDT'],
  'AVAX/USDT': ['ETH/USDT', 'SOL/USDT'],
  'MATIC/USDT': ['ETH/USDT'],
  'ADA/USDT': ['DOT/USDT'],
  'DOT/USDT': ['ADA/USDT'],
  'XRP/USDT': [],
  'BNB/USDT': ['ETH/USDT'],
  'LINK/USDT': ['ETH/USDT'],
};

/**
 * Verifie si deux paires sont correlees.
 */
function areCorrelated(pairA: string, pairB: string): boolean {
  const correlatedWithA = CORRELATION_PAIRS[pairA] ?? [];
  const correlatedWithB = CORRELATION_PAIRS[pairB] ?? [];
  return correlatedWithA.includes(pairB) || correlatedWithB.includes(pairA);
}

/**
 * Calcule le score de concentration pour un ensemble d'allocations.
 * Penalise les allocations correlees.
 */
function calculateCorrelationPenalty(
  allocations: Map<string, number>
): Map<string, number> {
  const penalties = new Map<string, number>();

  const pairs = Array.from(allocations.keys());

  for (const pair of pairs) {
    let correlatedAllocation = 0;

    for (const otherPair of pairs) {
      if (pair === otherPair) continue;
      if (areCorrelated(pair, otherPair)) {
        correlatedAllocation += allocations.get(otherPair) ?? 0;
      }
    }

    // If correlated assets represent >30% combined, apply penalty
    const currentAlloc = allocations.get(pair) ?? 0;
    const combinedCorrelated = currentAlloc + correlatedAllocation;

    if (combinedCorrelated > 40) {
      const penalty = (combinedCorrelated - 40) / 100;
      penalties.set(pair, penalty);
    } else {
      penalties.set(pair, 0);
    }
  }

  return penalties;
}

/**
 * Calcule le reequilibrage optimal du portefeuille.
 *
 * @param positions - Positions actuelles avec leur valeur en USD
 * @param signals - Signaux de trading pour chaque paire (-100 a +100)
 * @returns Allocations cibles avec actions requises
 */
export function calculateRebalance(
  positions: PositionInput[],
  signals: SignalInput[]
): PortfolioAllocation[] {
  if (positions.length === 0 && signals.length === 0) {
    return [];
  }

  const totalPortfolioValue = positions.reduce((sum, p) => sum + p.value, 0);

  if (totalPortfolioValue <= 0) {
    // No existing positions — build from signals
    return buildFromSignals(signals);
  }

  // Calculate current percentages
  const currentAllocations = new Map<string, number>();
  for (const position of positions) {
    const pct = (position.value / totalPortfolioValue) * 100;
    currentAllocations.set(position.pair, pct);
  }

  // Build signal map
  const signalMap = new Map<string, number>();
  for (const signal of signals) {
    signalMap.set(signal.pair, signal.score);
  }

  // Calculate target allocations based on signals
  const targetAllocations = new Map<string, number>();
  const allPairs = new Set([
    ...positions.map((p) => p.pair),
    ...signals.map((s) => s.pair),
  ]);

  // Score-based allocation: higher positive scores = larger allocation
  let totalPositiveScore = 0;
  const pairScores = new Map<string, number>();

  for (const pair of allPairs) {
    const signal = signalMap.get(pair) ?? 0;
    const currentPct = currentAllocations.get(pair) ?? 0;

    // Blend current allocation with signal-based target
    // Strong signal = more weight to signal, weak signal = keep current
    const signalStrength = Math.abs(signal) / 100;
    const signalTarget = signal > 0 ? Math.min(MAX_SINGLE_ASSET_PCT, signal / 5) : 0;
    const blendedTarget = currentPct * (1 - signalStrength * 0.5) + signalTarget * (signalStrength * 0.5);

    const adjustedScore = Math.max(0, blendedTarget);
    pairScores.set(pair, adjustedScore);
    totalPositiveScore += adjustedScore;
  }

  // Normalize to 100% and apply max constraint
  for (const pair of allPairs) {
    const score = pairScores.get(pair) ?? 0;
    let targetPct =
      totalPositiveScore > 0 ? (score / totalPositiveScore) * 100 : 0;

    // Cap at max single asset
    targetPct = Math.min(MAX_SINGLE_ASSET_PCT, targetPct);
    targetAllocations.set(pair, targetPct);
  }

  // Apply correlation penalties
  const penalties = calculateCorrelationPenalty(targetAllocations);
  for (const [pair, penalty] of penalties) {
    if (penalty > 0) {
      const current = targetAllocations.get(pair) ?? 0;
      targetAllocations.set(pair, current * (1 - penalty));
    }
  }

  // Normalize again after penalties
  const totalTarget = Array.from(targetAllocations.values()).reduce((s, v) => s + v, 0);
  if (totalTarget > 0 && totalTarget !== 100) {
    const scale = 100 / totalTarget;
    for (const [pair, pct] of targetAllocations) {
      targetAllocations.set(pair, Math.min(MAX_SINGLE_ASSET_PCT, pct * scale));
    }
  }

  // Generate allocation actions
  const result: PortfolioAllocation[] = [];

  for (const pair of allPairs) {
    const currentPct = parseFloat((currentAllocations.get(pair) ?? 0).toFixed(2));
    const targetPct = parseFloat((targetAllocations.get(pair) ?? 0).toFixed(2));
    const deviation = targetPct - currentPct;
    const signal = signalMap.get(pair) ?? 0;
    const penalty = penalties.get(pair) ?? 0;

    let action: 'increase' | 'decrease' | 'hold' = 'hold';
    let reason = 'Allocation within threshold';

    if (Math.abs(deviation) > REBALANCE_THRESHOLD_PCT) {
      if (deviation > 0) {
        action = 'increase';
        reason = signal > 50
          ? `Strong bullish signal (${signal}), increase allocation`
          : `Under-allocated by ${deviation.toFixed(1)}%`;
      } else {
        action = 'decrease';
        reason = signal < -50
          ? `Strong bearish signal (${signal}), reduce allocation`
          : `Over-allocated by ${Math.abs(deviation).toFixed(1)}%`;
      }

      if (penalty > 0) {
        reason += ` (correlation penalty applied: ${(penalty * 100).toFixed(0)}%)`;
      }
    } else if (currentPct > MAX_SINGLE_ASSET_PCT) {
      action = 'decrease';
      reason = `Exceeds max single asset limit of ${MAX_SINGLE_ASSET_PCT}%`;
    }

    result.push({
      pair,
      targetPct,
      currentPct,
      action,
      reason,
    });
  }

  return result.sort((a, b) => {
    const order = { decrease: 0, increase: 1, hold: 2 };
    return order[a.action] - order[b.action];
  });
}

/**
 * Construit un portefeuille initial a partir de signaux uniquement.
 */
function buildFromSignals(signals: SignalInput[]): PortfolioAllocation[] {
  const positiveSignals = signals.filter((s) => s.score > 0);

  if (positiveSignals.length === 0) {
    return signals.map((s) => ({
      pair: s.pair,
      targetPct: 0,
      currentPct: 0,
      action: 'hold' as const,
      reason: 'No bullish signal — stay in cash',
    }));
  }

  const totalScore = positiveSignals.reduce((sum, s) => sum + s.score, 0);

  return positiveSignals.map((s) => {
    const rawPct = (s.score / totalScore) * 100;
    const targetPct = parseFloat(Math.min(MAX_SINGLE_ASSET_PCT, rawPct).toFixed(2));

    return {
      pair: s.pair,
      targetPct,
      currentPct: 0,
      action: 'increase' as const,
      reason: `New position — signal score ${s.score}`,
    };
  });
}
