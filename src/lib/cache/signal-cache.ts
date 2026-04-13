// =============================================================================
// MIDAS — Signal Cache
// Cache Redis Upstash pour les signaux de trading (fallback quand Binance est down)
// Graceful: si Redis indisponible, retourne null, ne throw jamais
// =============================================================================

import { redis } from '@/lib/cache/upstash';

const SIGNAL_PREFIX = 'midas:signals:';
const DEFAULT_TTL_SECONDS = 3600; // 1 heure
const STALE_THRESHOLD_SECONDS = 300; // 5 minutes

interface CachedSignalEntry<T> {
  data: T;
  cachedAt: number; // timestamp ms
}

export interface CachedSignalResult<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

/**
 * Cache des signaux de trading dans Redis.
 * Graceful: retourne true si succes, false si echec (Redis down).
 */
export async function cacheSignals<T>(
  key: string,
  data: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<boolean> {
  try {
    const entry: CachedSignalEntry<T> = {
      data,
      cachedAt: Date.now(),
    };
    await redis.set(`${SIGNAL_PREFIX}${key}`, JSON.stringify(entry), {
      ex: ttlSeconds,
    });
    return true;
  } catch {
    // Redis indisponible — graceful degradation
    return false;
  }
}

/**
 * Recupere des signaux caches depuis Redis.
 * Retourne null si pas de cache ou si Redis est down.
 * isStale = true si les donnees ont plus de 5 minutes.
 */
export async function getCachedSignals<T>(
  key: string
): Promise<CachedSignalResult<T> | null> {
  try {
    const raw = await redis.get<string>(`${SIGNAL_PREFIX}${key}`);
    if (!raw) return null;

    const parsed: CachedSignalEntry<T> = typeof raw === 'string'
      ? JSON.parse(raw) as CachedSignalEntry<T>
      : raw as unknown as CachedSignalEntry<T>;

    if (!parsed.data || !parsed.cachedAt) return null;

    const ageSeconds = (Date.now() - parsed.cachedAt) / 1000;

    return {
      data: parsed.data,
      timestamp: parsed.cachedAt,
      isStale: ageSeconds > STALE_THRESHOLD_SECONDS,
    };
  } catch {
    // Redis indisponible — graceful degradation
    return null;
  }
}

/**
 * Invalide le cache pour une cle de signal donnee.
 * Retourne true si succes, false si echec.
 */
export async function invalidateSignalCache(key: string): Promise<boolean> {
  try {
    await redis.del(`${SIGNAL_PREFIX}${key}`);
    return true;
  } catch {
    // Redis indisponible — graceful degradation
    return false;
  }
}
