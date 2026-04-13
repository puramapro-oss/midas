// =============================================================================
// MIDAS — Dune Analytics Provider
// Free tier. Exécute des queries SQL on-chain prédéfinies.
// API: https://api.dune.com/api/v1/query/{queryId}/results
// =============================================================================

import { cacheGetOrSet } from '@/lib/cache/upstash';

const DUNE_BASE = 'https://api.dune.com/api/v1';
const TIMEOUT_MS = 30000;

function getKey(): string | null {
  return process.env.DUNE_API_KEY?.trim() || null;
}

async function duneFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const key = getKey();
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${DUNE_BASE}${path}`, {
      ...init,
      headers: {
        'X-Dune-API-Key': key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface DuneQueryResult<Row = Record<string, unknown>> {
  execution_id: string;
  query_id: number;
  state: string;
  result?: {
    rows: Row[];
    metadata: {
      column_names: string[];
      row_count: number;
    };
  };
}

/**
 * Récupère les derniers résultats d'une query Dune (résultats déjà cachés côté Dune).
 * À utiliser avec les Query IDs pré-créés (exchange flows, holder distribution, etc.).
 */
export async function fetchDuneResults<Row = Record<string, unknown>>(
  queryId: number,
  cacheTtlSec = 600,
): Promise<DuneQueryResult<Row> | null> {
  return cacheGetOrSet(
    `dune:results:${queryId}`,
    async () => duneFetch<DuneQueryResult<Row>>(`/query/${queryId}/results`),
    cacheTtlSec,
  );
}

/**
 * Lance une exécution fraîche d'une query Dune (consomme du crédit).
 */
export async function executeDuneQuery(queryId: number): Promise<{ execution_id: string } | null> {
  return duneFetch<{ execution_id: string }>(`/query/${queryId}/execute`, { method: 'POST' });
}
