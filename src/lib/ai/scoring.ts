// =============================================================================
// MIDAS — Scoring Utilities
// Calcul du score composite et normalisation des scores agents
// =============================================================================

import type { AgentResult } from '@/lib/agents/types';

// --- Default Agent Weights ---

const DEFAULT_WEIGHTS: Record<string, number> = {
  technical: 0.30,
  sentiment: 0.15,
  onchain: 0.15,
  pattern: 0.15,
  calendar: 0.10,
  risk: 0.15,
};

// --- Score Normalization ---

/**
 * Normalise un score brut dans l'intervalle [-1, 1].
 */
export function normalizeScore(raw: number, min = -1, max = 1): number {
  if (max === min) return 0;
  const clamped = Math.max(min, Math.min(max, raw));
  return (2 * (clamped - min)) / (max - min) - 1;
}

/**
 * Normalise un score de 0 a 1 (positif uniquement).
 */
export function normalizeScorePositive(raw: number, min = 0, max = 1): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (raw - min) / (max - min)));
}

// --- Composite Score Calculation ---

interface CompositeScoreResult {
  score: number;
  confidence: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  weighted_contributions: Record<string, number>;
  alignment: number;
}

/**
 * Calcule le score composite a partir des resultats de tous les agents.
 * Utilise les poids fournis ou les poids par defaut.
 */
export function calculateCompositeScore(
  agentResults: AgentResult[],
  weights?: Record<string, number>
): CompositeScoreResult {
  const effectiveWeights = weights ?? DEFAULT_WEIGHTS;

  let weightedSum = 0;
  let totalWeight = 0;
  let weightedConfidence = 0;
  const contributions: Record<string, number> = {};

  for (const result of agentResults) {
    // Le risk agent n'est pas inclus dans le score directionnel
    if (result.agent_name === 'risk') continue;

    const weight = effectiveWeights[result.agent_name] ?? 0.1;
    const contribution = result.score * weight;

    weightedSum += contribution;
    totalWeight += weight;
    weightedConfidence += result.confidence * weight;
    contributions[result.agent_name] = contribution;
  }

  const compositeScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const compositeConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;

  // Calculate alignment (how much agents agree)
  const directionalResults = agentResults.filter((r) => r.agent_name !== 'risk');
  const bullishCount = directionalResults.filter((r) => r.signal === 'bullish').length;
  const bearishCount = directionalResults.filter((r) => r.signal === 'bearish').length;
  const total = directionalResults.length;
  const alignment = total > 0 ? Math.max(bullishCount, bearishCount) / total : 0;

  // Determine signal
  let signal: CompositeScoreResult['signal'];
  if (compositeScore > 0.15) {
    signal = 'bullish';
  } else if (compositeScore < -0.15) {
    signal = 'bearish';
  } else {
    signal = 'neutral';
  }

  // Boost confidence if agents are aligned
  const adjustedConfidence = Math.min(0.95, compositeConfidence * (0.7 + alignment * 0.3));

  return {
    score: Math.max(-1, Math.min(1, compositeScore)),
    confidence: adjustedConfidence,
    signal,
    weighted_contributions: contributions,
    alignment,
  };
}

/**
 * Calcule le score pour une direction specifique (buy ou sell).
 * Retourne un score positif pour la direction, 0 si le signal ne correspond pas.
 */
export function calculateDirectionalScore(
  agentResults: AgentResult[],
  direction: 'buy' | 'sell',
  weights?: Record<string, number>
): number {
  const composite = calculateCompositeScore(agentResults, weights);
  const expectedSignal = direction === 'buy' ? 'bullish' : 'bearish';

  if (composite.signal !== expectedSignal) return 0;

  return Math.abs(composite.score) * composite.confidence;
}
