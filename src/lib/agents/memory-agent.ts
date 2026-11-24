// Personal retrospective analytics. Historical win rates do not predict market
// direction and must not be published in the global agent bus.
import type { AgentResult } from './types';
import { createServiceClient } from '@/lib/supabase/server';
import { readMemoryHistory, summarizeMemory, type MemoryScope } from './memory-history';

export async function analyzeMemory(pair: string, scope: MemoryScope): Promise<AgentResult> {
  const started = Date.now();
  try {
    const history = await readMemoryHistory(createServiceClient(), pair, scope);
    const summary = summarizeMemory(history);
    return {
      agent_name: 'memory',
      signal: 'neutral',
      score: 0,
      confidence: 0, // No calibrated directional forecast is made here.
      reasoning: summary.win_rate === null
        ? `Aucun historique exploitable sur ${pair} (90j).`
        : `${summary.trades_analyzed} opérations ${scope.isPaper ? 'simulées' : 'réelles'} sur ${pair} (90j), ` +
          `${(summary.win_rate * 100).toFixed(0)}% gagnantes. Statistique rétrospective, sans prévision directionnelle.`,
      data: { ...summary, is_paper: scope.isPaper, duration_ms: Date.now() - started },
      timestamp: new Date(),
    };
  } catch {
    return {
      agent_name: 'memory', signal: 'neutral', score: 0, confidence: 0,
      reasoning: 'Historique personnel indisponible.',
      data: { unavailable: true, duration_ms: Date.now() - started },
      timestamp: new Date(),
    };
  }
}
