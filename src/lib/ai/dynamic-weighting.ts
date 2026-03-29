// =============================================================================
// MIDAS — Dynamic Weighting
// Ajuste les poids des agents selon le regime de marche et les performances
// =============================================================================

import type { MarketRegime } from '@/lib/agents/types';

// --- Types ---

interface AgentWeights {
  technical: number;
  sentiment: number;
  onchain: number;
  pattern: number;
  calendar: number;
}

// --- Default Weights ---

const DEFAULT_WEIGHTS: AgentWeights = {
  technical: 0.30,
  sentiment: 0.15,
  onchain: 0.15,
  pattern: 0.20,
  calendar: 0.10,
};

// --- Regime-Based Adjustments ---

const REGIME_ADJUSTMENTS: Record<MarketRegime, Partial<AgentWeights>> = {
  strong_bull: {
    technical: 0.35,
    pattern: 0.25,
    sentiment: 0.10,
    onchain: 0.15,
    calendar: 0.05,
  },
  weak_bull: {
    technical: 0.30,
    pattern: 0.20,
    sentiment: 0.15,
    onchain: 0.15,
    calendar: 0.10,
  },
  ranging: {
    technical: 0.20,
    pattern: 0.30,
    sentiment: 0.15,
    onchain: 0.15,
    calendar: 0.10,
  },
  weak_bear: {
    technical: 0.30,
    pattern: 0.20,
    sentiment: 0.20,
    onchain: 0.15,
    calendar: 0.10,
  },
  strong_bear: {
    technical: 0.25,
    pattern: 0.15,
    sentiment: 0.25,
    onchain: 0.15,
    calendar: 0.15,
  },
  crash: {
    technical: 0.15,
    sentiment: 0.30,
    onchain: 0.20,
    pattern: 0.10,
    calendar: 0.15,
  },
  high_volatility: {
    technical: 0.25,
    pattern: 0.15,
    sentiment: 0.25,
    onchain: 0.15,
    calendar: 0.15,
  },
  low_volatility: {
    technical: 0.35,
    pattern: 0.25,
    sentiment: 0.10,
    onchain: 0.15,
    calendar: 0.05,
  },
};

// --- Normalization ---

/**
 * Normalise les poids pour que leur somme soit exactement 1.
 */
export function normalizeWeights(weights: AgentWeights): AgentWeights {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

  if (total === 0) {
    return { ...DEFAULT_WEIGHTS };
  }

  return {
    technical: weights.technical / total,
    sentiment: weights.sentiment / total,
    onchain: weights.onchain / total,
    pattern: weights.pattern / total,
    calendar: weights.calendar / total,
  };
}

// --- Dynamic Adjustment ---

/**
 * Retourne les poids par defaut.
 */
export function getDefaultWeights(): AgentWeights {
  return { ...DEFAULT_WEIGHTS };
}

/**
 * Ajuste les poids des agents selon le regime de marche.
 * Retourne des poids normalises (somme = 1).
 */
export function adjustWeightsForRegime(regime: MarketRegime): AgentWeights {
  const regimeWeights = REGIME_ADJUSTMENTS[regime];
  const adjusted: AgentWeights = {
    ...DEFAULT_WEIGHTS,
    ...regimeWeights,
  };

  return normalizeWeights(adjusted);
}

/**
 * Ajuste les poids en fonction des performances historiques des agents.
 * Les agents avec un meilleur taux de reussite recoivent plus de poids.
 * @param baseWeights - Poids de base (par exemple depuis adjustWeightsForRegime)
 * @param performances - Taux de reussite par agent (0 a 1)
 * @param blendFactor - Facteur de melange (0 = 100% base, 1 = 100% performance)
 */
export function adjustWeightsForPerformance(
  baseWeights: AgentWeights,
  performances: Partial<AgentWeights>,
  blendFactor = 0.3
): AgentWeights {
  const clampedBlend = Math.max(0, Math.min(1, blendFactor));

  const adjusted: AgentWeights = { ...baseWeights };

  const agentNames: (keyof AgentWeights)[] = ['technical', 'sentiment', 'onchain', 'pattern', 'calendar'];

  for (const name of agentNames) {
    const perf = performances[name];
    if (perf !== undefined) {
      // Blend between base weight and performance-adjusted weight
      const perfWeight = perf * baseWeights[name] * 2; // Performance multiplie le poids de base
      adjusted[name] = baseWeights[name] * (1 - clampedBlend) + perfWeight * clampedBlend;
    }
  }

  return normalizeWeights(adjusted);
}

/**
 * Calcule les poids finaux en combinant regime + performance.
 */
export function calculateFinalWeights(
  regime: MarketRegime,
  performances?: Partial<AgentWeights>
): AgentWeights {
  const regimeWeights = adjustWeightsForRegime(regime);

  if (!performances) return regimeWeights;

  return adjustWeightsForPerformance(regimeWeights, performances);
}

/**
 * Convertit AgentWeights en Record<string, number> pour les fonctions de scoring.
 */
export function weightsToRecord(weights: AgentWeights): Record<string, number> {
  return {
    technical: weights.technical,
    sentiment: weights.sentiment,
    onchain: weights.onchain,
    pattern: weights.pattern,
    calendar: weights.calendar,
  };
}

export type { AgentWeights };
