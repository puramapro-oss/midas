// =============================================================================
// MIDAS — Macro Agent
// Données macro-économiques : FRED (US), Fear & Greed crypto, dollar index proxy.
// API gratuite sans clé : alternative.me/fng + FRED open CSV (fredgraph).
// =============================================================================

import type { AgentResult } from './types';
import { publishHeartbeat, publishSignal } from './agent-bus';

interface FearGreedResponse {
  data: { value: string; value_classification: string; timestamp: string }[];
}

async function fetchFearGreed(): Promise<{ value: number; label: string } | null> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as FearGreedResponse;
    const item = j.data?.[0];
    if (!item) return null;
    return { value: parseInt(item.value, 10), label: item.value_classification };
  } catch {
    return null;
  }
}

/**
 * Lit la dernière valeur d'une série FRED via le CSV public (pas de clé requise).
 * Series IDs typiques : DGS10 (10Y treasury), CPIAUCSL (inflation), DXY proxy.
 */
async function fetchFredSeries(seriesId: string): Promise<number | null> {
  try {
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    // Last non-empty data line, take last column as value
    for (let i = lines.length - 1; i >= 1; i--) {
      const parts = lines[i].split(',');
      const v = parseFloat(parts[parts.length - 1]);
      if (!isNaN(v)) return v;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Analyse macro globale. Retourne un signal directionnel pour la pair.
 * Heuristique :
 * - Fear & Greed extrême (<20) → bullish (capitulation = opportunité)
 * - Fear & Greed extrême (>80) → bearish (greed = risque)
 * - Taux 10Y > 4.5% et inflation forte → bearish risk-on
 */
export async function analyzeMacro(pair: string): Promise<AgentResult> {
  const startMs = Date.now();
  const [fng, dgs10] = await Promise.all([
    fetchFearGreed(),
    fetchFredSeries('DGS10'),
  ]);

  let score = 0;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let confidence = 0.5;
  const reasons: string[] = [];

  if (fng) {
    if (fng.value < 20) {
      score += 0.4;
      reasons.push(`Fear & Greed ${fng.value} (${fng.label}) — capitulation, signal contrarian bullish`);
      confidence += 0.15;
    } else if (fng.value > 80) {
      score -= 0.4;
      reasons.push(`Fear & Greed ${fng.value} (${fng.label}) — euphorie, signal contrarian bearish`);
      confidence += 0.15;
    } else if (fng.value < 40) {
      score += 0.15;
      reasons.push(`Fear & Greed ${fng.value} (${fng.label}) — sentiment prudent`);
    } else if (fng.value > 60) {
      score -= 0.15;
      reasons.push(`Fear & Greed ${fng.value} (${fng.label}) — sentiment positif`);
    } else {
      reasons.push(`Fear & Greed ${fng.value} (${fng.label}) — neutre`);
    }
  } else {
    reasons.push('Fear & Greed indisponible');
  }

  if (dgs10 !== null) {
    if (dgs10 > 4.5) {
      score -= 0.2;
      reasons.push(`Taux 10Y US ${dgs10.toFixed(2)}% — pression risk-off`);
      confidence += 0.1;
    } else if (dgs10 < 3) {
      score += 0.15;
      reasons.push(`Taux 10Y US ${dgs10.toFixed(2)}% — environnement risk-on`);
      confidence += 0.1;
    } else {
      reasons.push(`Taux 10Y US ${dgs10.toFixed(2)}% — neutre`);
    }
  }

  if (score > 0.15) signal = 'bullish';
  else if (score < -0.15) signal = 'bearish';

  confidence = Math.min(0.95, confidence);

  const result: AgentResult = {
    agent_name: 'macro',
    signal,
    score: Math.max(-1, Math.min(1, score)),
    confidence,
    reasoning: reasons.join(' • '),
    data: {
      fear_greed: fng?.value ?? null,
      fear_greed_label: fng?.label ?? null,
      dgs10: dgs10 ?? null,
      duration_ms: Date.now() - startMs,
    },
    timestamp: new Date(),
  };

  await publishHeartbeat({
    name: 'macro',
    status: 'running',
    last_beat_ms: Date.now(),
    metrics: { last_score: result.score, duration_ms: Date.now() - startMs },
  });

  await publishSignal({
    agent: 'macro',
    type: 'macro_snapshot',
    symbol: pair,
    direction: signal,
    confidence,
    reasoning: result.reasoning,
    data: result.data,
    ts: Date.now(),
  });

  return result;
}
