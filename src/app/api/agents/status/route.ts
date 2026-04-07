import { NextResponse } from 'next/server';
import { readAllHeartbeats, readRecentSignals } from '@/lib/agents/agent-bus';

export async function GET() {
  try {
    const [agents, signals] = await Promise.all([
      readAllHeartbeats(),
      readRecentSignals(30),
    ]);

    const now = Date.now();
    // Mark agents as 'stopped' if heartbeat older than 90s
    const enriched = agents.map((a) => ({
      ...a,
      status:
        a.last_beat_ms === 0
          ? 'stopped'
          : now - a.last_beat_ms > 90_000
            ? 'stopped'
            : a.status,
      seconds_since_last_beat: a.last_beat_ms === 0 ? null : Math.round((now - a.last_beat_ms) / 1000),
    }));

    return NextResponse.json({
      agents: enriched,
      signals,
      total_agents: enriched.length,
      running: enriched.filter((a) => a.status === 'running').length,
      ts: now,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
