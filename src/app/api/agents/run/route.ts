import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeMacro } from '@/lib/agents/macro-agent';
import { analyzeDefi } from '@/lib/agents/defi-agent';
import { analyzeMemory } from '@/lib/agents/memory-agent';
import { analyzeSentiment } from '@/lib/agents/sentiment-agent';
import { analyzeOnChain } from '@/lib/agents/onchain-agent';
import { analyzeCalendar } from '@/lib/agents/calendar-agent';
import { analyzeTechnical } from '@/lib/agents/technical-agent';
import { analyzePatterns } from '@/lib/agents/pattern-agent';
import { publishHeartbeat } from '@/lib/agents/agent-bus';
import { fetchKlines } from '@/lib/exchange/binance-public';
import type { AgentResult, Candle } from '@/lib/agents/types';

const ALL_AGENTS = [
  'macro',
  'defi',
  'memory',
  'sentiment',
  'onchain',
  'calendar',
  'technical',
  'pattern',
] as const;

type AgentName = (typeof ALL_AGENTS)[number];

const bodySchema = z.object({
  pair: z.string().min(2).max(20).default('BTC/USDT'),
  agents: z.array(z.enum(ALL_AGENTS)).optional(),
  interval: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).default('1h'),
});

/**
 * Lance les agents Phase 2 (8 agents directionnels) sur une paire.
 * Publie heartbeats + signaux dans Redis. Retourne les résultats agrégés.
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const { pair, agents, interval } = bodySchema.parse(json);
    const requested: AgentName[] = (agents ?? [...ALL_AGENTS]) as AgentName[];

    // Master heartbeat
    await publishHeartbeat({
      name: 'master',
      status: 'running',
      last_beat_ms: Date.now(),
      metrics: { dispatch: requested.length },
    });

    // Fetch candles only if a candle-based agent is requested
    let candles: Candle[] = [];
    if (requested.includes('technical') || requested.includes('pattern')) {
      try {
        candles = await fetchKlines(pair, interval, 200);
        await publishHeartbeat({
          name: 'market_data',
          status: 'running',
          last_beat_ms: Date.now(),
          metrics: { candles: candles.length, interval },
        });
      } catch (e) {
        await publishHeartbeat({
          name: 'market_data',
          status: 'error',
          last_beat_ms: Date.now(),
          last_error: e instanceof Error ? e.message : 'fetch klines failed',
        });
      }
    }

    const tasks: Promise<AgentResult>[] = [];
    const labels: AgentName[] = [];

    for (const a of requested) {
      switch (a) {
        case 'macro':
          tasks.push(analyzeMacro(pair));
          break;
        case 'defi':
          tasks.push(analyzeDefi(pair));
          break;
        case 'memory':
          tasks.push(analyzeMemory(pair));
          break;
        case 'sentiment':
          tasks.push(analyzeSentiment(pair));
          break;
        case 'onchain':
          tasks.push(analyzeOnChain(pair));
          break;
        case 'calendar':
          tasks.push(analyzeCalendar(pair));
          break;
        case 'technical':
          if (candles.length > 0) tasks.push(analyzeTechnical(pair, candles));
          break;
        case 'pattern':
          if (candles.length > 0) tasks.push(analyzePatterns(pair, candles));
          break;
      }
      labels.push(a);
    }

    const settled = await Promise.allSettled(tasks);
    const results = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : {
            agent_name: labels[i] ?? 'unknown',
            signal: 'neutral' as const,
            score: 0,
            confidence: 0,
            reasoning: `Erreur: ${s.reason instanceof Error ? s.reason.message : 'inconnue'}`,
            data: {},
            timestamp: new Date(),
          },
    );

    const consensus = computeConsensus(results);

    return NextResponse.json({
      pair,
      interval,
      agents_run: labels,
      candles_count: candles.length,
      results,
      consensus,
      ts: Date.now(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

interface Consensus {
  direction: 'bullish' | 'bearish' | 'neutral';
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  avg_confidence: number;
  composite_score: number;
}

function computeConsensus(results: AgentResult[]): Consensus {
  let bullish = 0,
    bearish = 0,
    neutral = 0;
  let scoreSum = 0;
  let confSum = 0;
  for (const r of results) {
    if (r.signal === 'bullish') bullish++;
    else if (r.signal === 'bearish') bearish++;
    else neutral++;
    scoreSum += r.score;
    confSum += r.confidence;
  }
  const n = Math.max(1, results.length);
  const composite = scoreSum / n;
  return {
    direction: composite > 0.15 ? 'bullish' : composite < -0.15 ? 'bearish' : 'neutral',
    bullish_count: bullish,
    bearish_count: bearish,
    neutral_count: neutral,
    avg_confidence: confSum / n,
    composite_score: composite,
  };
}

export async function GET() {
  return NextResponse.json({
    info: 'POST { pair: "BTC/USDT", agents?: [...], interval?: "1h" }',
    available_agents: ALL_AGENTS,
  });
}
