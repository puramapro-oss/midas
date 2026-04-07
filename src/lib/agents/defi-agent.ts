// =============================================================================
// MIDAS — DeFi Agent
// DefiLlama public API : TVL globale, stablecoins flows, top protocoles.
// Détecte si le capital flow est risk-on (TVL ↑) ou risk-off (stablecoins ↑).
// =============================================================================

import type { AgentResult } from './types';
import { publishHeartbeat, publishSignal } from './agent-bus';

interface ChartPoint {
  date: string;
  totalLiquidityUSD?: number;
  tvl?: number;
}

async function fetchGlobalTvlChart(): Promise<ChartPoint[] | null> {
  try {
    const res = await fetch('https://api.llama.fi/v2/historicalChainTvl', {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ChartPoint[];
  } catch {
    return null;
  }
}

interface StablecoinSnapshot {
  totalCirculatingUSD?: { peggedUSD?: number };
  date?: string;
}

async function fetchStablecoinsFlow(): Promise<{ delta_pct: number } | null> {
  try {
    const res = await fetch(
      'https://stablecoins.llama.fi/stablecoincharts/all?stablecoin=1',
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as StablecoinSnapshot[];
    if (!Array.isArray(data) || data.length < 8) return null;
    const last = data[data.length - 1].totalCirculatingUSD?.peggedUSD ?? 0;
    const weekAgo = data[data.length - 8].totalCirculatingUSD?.peggedUSD ?? 0;
    if (weekAgo === 0) return null;
    return { delta_pct: ((last - weekAgo) / weekAgo) * 100 };
  } catch {
    return null;
  }
}

/**
 * Analyse DeFi : flow capital + stablecoins.
 * - TVL ↑ + stablecoins ↑ → bullish (capital qui arrive)
 * - TVL ↓ + stablecoins ↓ → bearish (capital qui sort)
 */
export async function analyzeDefi(pair: string): Promise<AgentResult> {
  const startMs = Date.now();
  const [chart, stablecoins] = await Promise.all([
    fetchGlobalTvlChart(),
    fetchStablecoinsFlow(),
  ]);

  let score = 0;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let confidence = 0.5;
  const reasons: string[] = [];

  let tvlDeltaPct: number | null = null;
  if (chart && chart.length >= 8) {
    const last = chart[chart.length - 1].tvl ?? chart[chart.length - 1].totalLiquidityUSD ?? 0;
    const weekAgo = chart[chart.length - 8].tvl ?? chart[chart.length - 8].totalLiquidityUSD ?? 0;
    if (weekAgo > 0) {
      tvlDeltaPct = ((last - weekAgo) / weekAgo) * 100;
      if (tvlDeltaPct > 5) {
        score += 0.35;
        confidence += 0.15;
        reasons.push(`TVL DeFi +${tvlDeltaPct.toFixed(1)}% sur 7j — capital affluent`);
      } else if (tvlDeltaPct < -5) {
        score -= 0.35;
        confidence += 0.15;
        reasons.push(`TVL DeFi ${tvlDeltaPct.toFixed(1)}% sur 7j — capital qui fuit`);
      } else {
        reasons.push(`TVL DeFi ${tvlDeltaPct >= 0 ? '+' : ''}${tvlDeltaPct.toFixed(1)}% sur 7j — stable`);
      }
    }
  } else {
    reasons.push('Données TVL DeFi indisponibles');
  }

  let stableDelta: number | null = null;
  if (stablecoins) {
    stableDelta = stablecoins.delta_pct;
    if (stableDelta > 1) {
      score += 0.2;
      reasons.push(`Stablecoins +${stableDelta.toFixed(2)}% sur 7j — pression acheteuse à venir`);
      confidence += 0.1;
    } else if (stableDelta < -1) {
      score -= 0.2;
      reasons.push(`Stablecoins ${stableDelta.toFixed(2)}% sur 7j — sortie de liquidité`);
      confidence += 0.1;
    } else {
      reasons.push(`Stablecoins ${stableDelta >= 0 ? '+' : ''}${stableDelta.toFixed(2)}% sur 7j — neutre`);
    }
  }

  if (score > 0.15) signal = 'bullish';
  else if (score < -0.15) signal = 'bearish';

  confidence = Math.min(0.95, confidence);

  const result: AgentResult = {
    agent_name: 'defi',
    signal,
    score: Math.max(-1, Math.min(1, score)),
    confidence,
    reasoning: reasons.join(' • '),
    data: {
      tvl_delta_pct: tvlDeltaPct,
      stablecoins_delta_pct: stableDelta,
      duration_ms: Date.now() - startMs,
    },
    timestamp: new Date(),
  };

  await publishHeartbeat({
    name: 'defi',
    status: 'running',
    last_beat_ms: Date.now(),
    metrics: { last_score: result.score, duration_ms: Date.now() - startMs },
  });

  await publishSignal({
    agent: 'defi',
    type: 'defi_flow',
    symbol: pair,
    direction: signal,
    confidence,
    reasoning: result.reasoning,
    data: result.data,
    ts: Date.now(),
  });

  return result;
}
