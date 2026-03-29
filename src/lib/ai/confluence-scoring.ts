// =============================================================================
// MIDAS — Confluence Scoring
// Compte les confluences entre agents et verifie le minimum requis
// =============================================================================

import type { AgentResult, ConfluenceAnalysis } from '@/lib/agents/types';

// --- Constants ---

const MIN_CONFLUENCES_REQUIRED = 4;

const AGENT_CONFLUENCE_WEIGHTS: Record<string, number> = {
  technical: 1.5,
  sentiment: 1.0,
  onchain: 1.0,
  pattern: 1.2,
  calendar: 0.8,
};

// --- Confluence Analysis ---

/**
 * Analyse les confluences entre les resultats des agents.
 * Une confluence est comptee quand un agent donne un signal directionnel
 * (bullish ou bearish) avec une confidence suffisante.
 */
export function analyzeConfluences(
  agentResults: AgentResult[],
  minConfidence = 0.3
): ConfluenceAnalysis {
  const points: ConfluenceAnalysis['points'] = [];

  for (const result of agentResults) {
    // Skip risk agent (not directional)
    if (result.agent_name === 'risk') continue;

    // Only count if agent has a directional signal with sufficient confidence
    if (result.signal === 'neutral' || result.confidence < minConfidence) continue;

    const weight = AGENT_CONFLUENCE_WEIGHTS[result.agent_name] ?? 1.0;

    // Adjust weight by confidence
    const adjustedWeight = weight * result.confidence;

    points.push({
      source: result.agent_name,
      signal: result.signal,
      weight: adjustedWeight,
    });
  }

  const totalBullish = points
    .filter((p) => p.signal === 'bullish')
    .reduce((sum, p) => sum + p.weight, 0);

  const totalBearish = points
    .filter((p) => p.signal === 'bearish')
    .reduce((sum, p) => sum + p.weight, 0);

  // Count distinct agents contributing to dominant direction
  const bullishAgents = new Set(points.filter((p) => p.signal === 'bullish').map((p) => p.source));
  const bearishAgents = new Set(points.filter((p) => p.signal === 'bearish').map((p) => p.source));
  const dominantCount = Math.max(bullishAgents.size, bearishAgents.size);

  // Met = enough distinct agents agree on a direction
  const met = dominantCount >= MIN_CONFLUENCES_REQUIRED;

  return {
    points,
    total_bullish: totalBullish,
    total_bearish: totalBearish,
    min_required: MIN_CONFLUENCES_REQUIRED,
    met,
  };
}

/**
 * Retourne la direction dominante des confluences.
 */
export function getDominantDirection(
  confluence: ConfluenceAnalysis
): 'bullish' | 'bearish' | 'neutral' {
  const diff = confluence.total_bullish - confluence.total_bearish;

  if (diff > 0.5) return 'bullish';
  if (diff < -0.5) return 'bearish';
  return 'neutral';
}

/**
 * Calcule un facteur de multiplicateur de confluence.
 * Plus les agents sont alignes, plus le multiplicateur est haut.
 */
export function getConfluenceMultiplier(confluence: ConfluenceAnalysis): number {
  if (!confluence.met) return 0;

  const total = confluence.total_bullish + confluence.total_bearish;
  if (total === 0) return 0;

  const dominant = Math.max(confluence.total_bullish, confluence.total_bearish);
  const ratio = dominant / total;

  // 1.0 = minimum (seulement le minimum requis), 1.5 = forte confluence
  return 0.5 + ratio;
}
