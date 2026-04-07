// =============================================================================
// MIDAS — Memory Agent
// Analyse rétrospective : interroge l'historique de trades pour détecter
// si une situation similaire (paire + stratégie) a été gagnante/perdante.
// =============================================================================

import type { AgentResult } from './types';
import { createServiceClient } from '@/lib/supabase/server';
import { publishHeartbeat, publishSignal } from './agent-bus';

interface TradeRow {
  id: string;
  symbol: string;
  strategy: string | null;
  pnl_usd: number | null;
  status: string | null;
  created_at: string;
  is_paper: boolean | null;
}

/**
 * Calcule le winrate et le P&L moyen sur les trades similaires (même paire)
 * exécutés sur les 90 derniers jours.
 */
export async function analyzeMemory(pair: string): Promise<AgentResult> {
  const startMs = Date.now();
  const supabase = createServiceClient();

  let trades: TradeRow[] = [];
  let queryError: string | null = null;

  try {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('trades')
      .select('id, symbol, strategy, pnl_usd, status, created_at, is_paper')
      .eq('symbol', pair)
      .eq('status', 'closed')
      .gte('created_at', since)
      .limit(500);
    if (error) queryError = error.message;
    trades = (data ?? []) as TradeRow[];
  } catch (e) {
    queryError = e instanceof Error ? e.message : 'unknown';
  }

  let score = 0;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let confidence = 0.4;
  const reasons: string[] = [];

  if (trades.length === 0) {
    reasons.push(
      queryError
        ? `Mémoire indisponible: ${queryError}`
        : `Aucun trade historique sur ${pair} (90j) — pas de pattern à exploiter`,
    );
  } else {
    const wins = trades.filter((t) => Number(t.pnl_usd ?? 0) > 0).length;
    const losses = trades.filter((t) => Number(t.pnl_usd ?? 0) < 0).length;
    const total = wins + losses;
    const winrate = total > 0 ? wins / total : 0;
    const totalPnl = trades.reduce((s, t) => s + Number(t.pnl_usd ?? 0), 0);

    reasons.push(
      `${trades.length} trades sur ${pair} (90j), winrate ${(winrate * 100).toFixed(0)}%, P&L cumulé ${totalPnl.toFixed(2)}$`,
    );

    if (winrate > 0.6 && total >= 5) {
      score += 0.3;
      confidence = 0.65;
      reasons.push('Historique favorable — prior bullish');
      signal = 'bullish';
    } else if (winrate < 0.4 && total >= 5) {
      score -= 0.3;
      confidence = 0.65;
      reasons.push('Historique défavorable — prudence');
      signal = 'bearish';
    } else if (total >= 3) {
      confidence = 0.5;
    }

    // Bonus / malus selon P&L cumulé
    if (totalPnl > 100) {
      score += 0.1;
    } else if (totalPnl < -100) {
      score -= 0.1;
    }
  }

  const result: AgentResult = {
    agent_name: 'memory',
    signal,
    score: Math.max(-1, Math.min(1, score)),
    confidence,
    reasoning: reasons.join(' • '),
    data: {
      trades_analyzed: trades.length,
      duration_ms: Date.now() - startMs,
    },
    timestamp: new Date(),
  };

  await publishHeartbeat({
    name: 'memory',
    status: 'running',
    last_beat_ms: Date.now(),
    metrics: { trades_analyzed: trades.length, duration_ms: Date.now() - startMs },
  });

  await publishSignal({
    agent: 'memory',
    type: 'historical_lookup',
    symbol: pair,
    direction: signal,
    confidence,
    reasoning: result.reasoning,
    data: result.data,
    ts: Date.now(),
  });

  return result;
}
