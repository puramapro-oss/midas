// =============================================================================
// MIDAS — Agent Bus
// Registre Redis (Upstash REST) pour heartbeats, signaux et statut des 9 agents.
// Compatible serverless : pas de pub/sub temps réel, mais clés TTL + listes.
// =============================================================================

import { redis } from '@/lib/cache/upstash';

export const AGENT_NAMES = [
  'master',
  'market_data',
  'technical',
  'sentiment',
  'onchain',
  'macro',
  'defi',
  'risk',
  'memory',
  'execution',
] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

export interface AgentHeartbeat {
  name: AgentName;
  status: 'running' | 'stopped' | 'error' | 'safe_mode';
  last_beat_ms: number;
  last_error?: string | null;
  metrics?: Record<string, number | string | null>;
}

export interface AgentSignal {
  agent: AgentName;
  type: string;
  symbol?: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
  data?: Record<string, unknown>;
  ts: number;
}

const HB_KEY = (n: AgentName) => `agent:hb:${n}`;
const HB_TTL = 60; // seconds
const SIGNAL_LIST = 'agent:signals';
const SIGNAL_MAX = 200;

/**
 * Publie un heartbeat pour un agent. TTL 60s : si l'agent ne ping plus,
 * la clé expire et il est considéré comme "stopped" par /api/agents/status.
 */
export async function publishHeartbeat(hb: AgentHeartbeat): Promise<void> {
  try {
    await redis.set(HB_KEY(hb.name), hb, { ex: HB_TTL });
  } catch {
    // Redis indisponible : on continue silencieusement
  }
}

/**
 * Lit l'état de tous les agents. Si l'heartbeat a expiré, l'agent est marqué stopped.
 */
export async function readAllHeartbeats(): Promise<AgentHeartbeat[]> {
  const out: AgentHeartbeat[] = [];
  for (const name of AGENT_NAMES) {
    try {
      const hb = await redis.get<AgentHeartbeat>(HB_KEY(name));
      if (hb) {
        out.push(hb);
      } else {
        out.push({
          name,
          status: 'stopped',
          last_beat_ms: 0,
          last_error: null,
        });
      }
    } catch {
      out.push({
        name,
        status: 'error',
        last_beat_ms: 0,
        last_error: 'Redis unreachable',
      });
    }
  }
  return out;
}

/**
 * Push un signal dans la liste circulaire (max 200 derniers).
 */
export async function publishSignal(sig: AgentSignal): Promise<void> {
  try {
    await redis.lpush(SIGNAL_LIST, JSON.stringify(sig));
    await redis.ltrim(SIGNAL_LIST, 0, SIGNAL_MAX - 1);
  } catch {
    // soft fail
  }
}

/**
 * Récupère les N derniers signaux publiés (tous agents confondus).
 */
export async function readRecentSignals(limit = 50): Promise<AgentSignal[]> {
  try {
    const raw = await redis.lrange(SIGNAL_LIST, 0, Math.max(0, limit - 1));
    return (raw ?? [])
      .map((r) => {
        try {
          return typeof r === 'string' ? (JSON.parse(r) as AgentSignal) : (r as AgentSignal);
        } catch {
          return null;
        }
      })
      .filter((s): s is AgentSignal => s !== null);
  } catch {
    return [];
  }
}
