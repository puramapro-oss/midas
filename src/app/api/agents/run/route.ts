import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeMacro } from '@/lib/agents/macro-agent';
import { analyzeDefi } from '@/lib/agents/defi-agent';
import { analyzeMemory } from '@/lib/agents/memory-agent';
import { publishHeartbeat } from '@/lib/agents/agent-bus';

const bodySchema = z.object({
  pair: z.string().min(2).max(20).default('BTC/USDT'),
  agents: z.array(z.enum(['macro', 'defi', 'memory'])).optional(),
});

/**
 * Lance les nouveaux agents Phase 2 (macro, defi, memory) sur une paire.
 * Publie heartbeats + signaux dans Redis. Retourne les résultats agrégés.
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const { pair, agents } = bodySchema.parse(json);
    const requested = agents ?? ['macro', 'defi', 'memory'];

    // Master heartbeat
    await publishHeartbeat({
      name: 'master',
      status: 'running',
      last_beat_ms: Date.now(),
      metrics: { dispatch: requested.length },
    });

    const tasks: Promise<unknown>[] = [];
    if (requested.includes('macro')) tasks.push(analyzeMacro(pair));
    if (requested.includes('defi')) tasks.push(analyzeDefi(pair));
    if (requested.includes('memory')) tasks.push(analyzeMemory(pair));

    const results = await Promise.all(tasks);

    return NextResponse.json({
      pair,
      agents_run: requested,
      results,
      ts: Date.now(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST { pair: "BTC/USDT", agents?: ["macro","defi","memory"] } pour lancer les nouveaux agents Phase 2',
  });
}
