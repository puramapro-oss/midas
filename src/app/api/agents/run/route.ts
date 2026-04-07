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
import { analyzeRisk } from '@/lib/agents/risk-agent';
import { analyzeExecution } from '@/lib/agents/execution-agent';
import { publishHeartbeat, publishSignal, type AgentName as BusAgentName } from '@/lib/agents/agent-bus';
import { fetchKlinesWithSource } from '@/lib/exchange/binance-public';
import type { AgentResult, Candle, MarketRegime } from '@/lib/agents/types';

const ALL_AGENTS = [
  'macro',
  'defi',
  'memory',
  'sentiment',
  'onchain',
  'calendar',
  'technical',
  'pattern',
  'risk',
  'execution',
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

    // Fetch candles si n'importe quel agent qui en a besoin est demandé
    const needsCandles =
      requested.includes('technical') ||
      requested.includes('pattern') ||
      requested.includes('risk') ||
      requested.includes('execution');

    let candles: Candle[] = [];
    let candleSource = 'none';
    if (needsCandles) {
      try {
        const result = await fetchKlinesWithSource(pair, interval, 200);
        candles = result.candles;
        candleSource = result.source;
        await publishHeartbeat({
          name: 'market_data',
          status: candles.length > 0 ? 'running' : 'error',
          last_beat_ms: Date.now(),
          last_error: candles.length === 0 ? 'no candles from any source' : null,
          metrics: { candles: candles.length, interval, source: candleSource },
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
        case 'risk': {
          if (candles.length > 0) {
            const lastClose = candles[candles.length - 1].close;
            tasks.push(
              analyzeRisk({
                pair,
                action: 'buy',
                entry_price: lastClose,
                stop_loss: lastClose * 0.97,
                take_profit: lastClose * 1.06,
                position_size_pct: 2,
                account_balance: 10_000,
                current_drawdown_pct: 0,
                open_positions: 0,
                daily_trades_count: 0,
                regime: 'ranging' as MarketRegime,
                candles,
                composite_score: 0.3,
                confidence: 0.7,
              }),
            );
          }
          break;
        }
        case 'execution': {
          if (candles.length > 0) {
            const lastClose = candles[candles.length - 1].close;
            tasks.push(
              analyzeExecution({
                pair,
                action: 'buy',
                entry_price: lastClose,
                stop_loss: lastClose * 0.97,
                take_profit: lastClose * 1.06,
                position_size_usd: 200,
                candles,
              }),
            );
          }
          break;
        }
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

    // Publish heartbeats + signals for ALL agents (even those that don't self-publish)
    await Promise.all(
      results.map(async (r, i) => {
        const status = settled[i].status === 'fulfilled' ? 'running' : 'error';
        const name = (labels[i] as BusAgentName) ?? 'master';
        await publishHeartbeat({
          name,
          status,
          last_beat_ms: Date.now(),
          last_error: settled[i].status === 'rejected' ? String((settled[i] as PromiseRejectedResult).reason) : null,
          metrics: { score: r.score, confidence: r.confidence },
        });
        await publishSignal({
          agent: name,
          type: `${r.agent_name}_signal`,
          symbol: pair,
          direction: r.signal,
          confidence: r.confidence,
          reasoning: r.reasoning.slice(0, 200),
          ts: Date.now(),
        });
      }),
    );

    const consensus = computeConsensus(results);

    return NextResponse.json({
      pair,
      interval,
      agents_run: labels,
      candles_count: candles.length,
      candles_source: candleSource,
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
