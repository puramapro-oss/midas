// =============================================================================
// MIDAS — API Manager (fallback + rate-limit + cache)
// Centralise tous les providers data. Tracker des appels par jour, fallback
// automatique en cas de quota dépassé, alerte email à 80%.
// =============================================================================

import { redis, cacheGet, cacheSet } from '@/lib/cache/upstash';
import { Resend } from 'resend';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Quotas mensuels / journaliers — alignés sur les plans free tier
// -----------------------------------------------------------------------------
export const API_QUOTAS: Record<string, { limit: number; period: 'day' | 'month' }> = {
  coinmarketcap: { limit: 10_000, period: 'month' },
  newsapi: { limit: 100, period: 'day' },
  etherscan: { limit: 100_000, period: 'day' },
  dune: { limit: 1_000, period: 'month' },
  coinmarketcal: { limit: 1_000, period: 'day' },
  youtube: { limit: 10_000, period: 'day' },
  coinpaprika: { limit: 20_000, period: 'month' },
  defillama: { limit: 999_999_999, period: 'day' },
  binance: { limit: 999_999_999, period: 'day' },
  reddit: { limit: 999_999_999, period: 'day' },
  'free-crypto-news': { limit: 999_999_999, period: 'day' },
  'fear-greed': { limit: 999_999_999, period: 'day' },
  'google-trends': { limit: 999_999_999, period: 'day' },
};

// -----------------------------------------------------------------------------
// Carte de fallback — si la source primaire est down/quota dépassé
// -----------------------------------------------------------------------------
export const FALLBACK_MAP: Record<string, string[]> = {
  coinmarketcap: ['coinpaprika', 'binance', 'coingecko'],
  newsapi: ['free-crypto-news', 'reddit', 'cryptopanic'],
  etherscan: ['dune', 'binance'],
  coinmarketcal: ['coinpaprika'],
  youtube: ['reddit', 'google-trends'],
  defillama: [],
  binance: ['coingecko'],
  reddit: ['free-crypto-news'],
  dune: ['etherscan'],
  'free-crypto-news': ['reddit', 'cryptopanic'],
  'fear-greed': [],
  'google-trends': [],
  coinpaprika: ['coinmarketcap', 'coingecko'],
};

// -----------------------------------------------------------------------------
// Cache TTL par catégorie de donnée (secondes)
// -----------------------------------------------------------------------------
export const CACHE_TTL = {
  price: 30,
  klines: 60,
  news: 300,
  onchain: 60,
  events: 3600,
  sentiment: 600,
  global: 300,
};

// -----------------------------------------------------------------------------
// Tracking journalier dans Upstash + cache Supabase optionnel
// -----------------------------------------------------------------------------
function dayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function monthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function usageKey(api: string): string {
  const q = API_QUOTAS[api];
  const period = q?.period === 'month' ? monthKey() : dayKey();
  return `apiusage:${api}:${period}`;
}

export async function trackApiCall(api: string): Promise<number> {
  try {
    const key = usageKey(api);
    const count = await redis.incr(`midas:${key}`);
    if (count === 1) {
      // expirer au début de la prochaine période
      const q = API_QUOTAS[api];
      const ttl = q?.period === 'month' ? 60 * 60 * 24 * 31 : 60 * 60 * 25;
      await redis.expire(`midas:${key}`, ttl);
    }
    const limit = API_QUOTAS[api]?.limit ?? Infinity;
    if (limit !== Infinity && count === Math.floor(limit * 0.8)) {
      // 80% atteint → alerte email
      void sendQuotaAlert(api, count, limit);
    }
    // Persist en DB (fire-and-forget, n'attend pas)
    void persistApiUsage(api, count);
    return count;
  } catch {
    return 0;
  }
}

export async function getApiUsage(api: string): Promise<{ count: number; limit: number; pct: number }> {
  const limit = API_QUOTAS[api]?.limit ?? 0;
  try {
    const raw = await cacheGet<number>(usageKey(api));
    const count = typeof raw === 'number' ? raw : 0;
    return { count, limit, pct: limit > 0 ? Math.round((count / limit) * 100) : 0 };
  } catch {
    return { count: 0, limit, pct: 0 };
  }
}

export async function isQuotaExhausted(api: string): Promise<boolean> {
  const u = await getApiUsage(api);
  return u.limit > 0 && u.count >= u.limit;
}

// -----------------------------------------------------------------------------
// Persistance Postgres (midas.api_usage) — fire-and-forget, async
// Complète Redis (real-time) avec un historique pour le dashboard admin.
// -----------------------------------------------------------------------------
// Client Supabase typé en mode untyped (le typage strict du SDK n'autorise pas
// l'override schema en runtime sans Database<typeof schema>). On accepte l'any
// local : l'écriture est fire-and-forget et silent-fail, RLS protège la table.
let _supa: ReturnType<typeof createSupabaseClient> | null = null;
function getSupa(): ReturnType<typeof createSupabaseClient> | null {
  if (_supa) return _supa;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  _supa = createSupabaseClient(url, key, {
    db: { schema: 'midas' as never },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supa;
}

async function persistApiUsage(api: string, count: number): Promise<void> {
  try {
    const supa = getSupa();
    if (!supa) return;
    const q = API_QUOTAS[api];
    const periodKey = q?.period === 'month' ? monthKey() : dayKey();
    const periodType = q?.period === 'month' ? 'month' : 'day';
    const limit = q?.limit ?? null;
    // Cast en unknown pour contourner les Database generics du SDK
    const table = (supa as unknown as { from: (t: string) => { upsert: (v: unknown, o: unknown) => Promise<unknown> } }).from('api_usage');
    await table.upsert(
      {
        api_name: api,
        period_key: periodKey,
        period_type: periodType,
        call_count: count,
        quota_limit: limit && limit < 999_999_999 ? limit : null,
      },
      { onConflict: 'api_name,period_key' }
    );
  } catch {
    // silent — Redis reste la source de vérité temps réel
  }
}

// -----------------------------------------------------------------------------
// Alerte email (Resend) au super admin
// -----------------------------------------------------------------------------
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

async function sendQuotaAlert(api: string, count: number, limit: number): Promise<void> {
  // Anti-spam : 1 alerte / api / jour
  const flagKey = `quota-alert:${api}:${dayKey()}`;
  const exists = await cacheGet<boolean>(flagKey);
  if (exists) return;
  await cacheSet(flagKey, true, 60 * 60 * 25);

  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: 'MIDAS Shield <noreply@purama.dev>',
      to: ['matiss.frasne@gmail.com'],
      subject: `[MIDAS] API ${api} à 80% du quota (${count}/${limit})`,
      html: `
        <h2>⚠️ Quota API à 80%</h2>
        <p><strong>API :</strong> ${api}</p>
        <p><strong>Usage :</strong> ${count} / ${limit}</p>
        <p>Le fallback automatique s'activera à 100%. Vérifie le dashboard admin.</p>
      `,
    });
  } catch {
    // silent
  }
}

// -----------------------------------------------------------------------------
// Wrapper de récupération avec fallback
// -----------------------------------------------------------------------------
export interface ApiSource<T> {
  name: string;
  fetch: () => Promise<T | null>;
}

/**
 * Tente la source primaire, puis chaque fallback dans l'ordre, jusqu'à obtenir
 * un résultat non null. Track l'usage de chaque API tentée.
 */
export async function fetchWithFallback<T>(
  primary: ApiSource<T>,
  fallbacks: Array<ApiSource<T>> = [],
): Promise<{ data: T | null; source: string }> {
  const tries: Array<ApiSource<T>> = [primary, ...fallbacks];
  for (const src of tries) {
    if (await isQuotaExhausted(src.name)) continue;
    try {
      const data = await src.fetch();
      await trackApiCall(src.name);
      if (data !== null && data !== undefined) {
        return { data, source: src.name };
      }
    } catch {
      // try next
    }
  }
  return { data: null, source: 'none' };
}

// -----------------------------------------------------------------------------
// Snapshot global pour le dashboard admin
// -----------------------------------------------------------------------------
export async function getAllApiUsage(): Promise<
  Array<{ api: string; count: number; limit: number; pct: number; period: 'day' | 'month' }>
> {
  const results: Array<{ api: string; count: number; limit: number; pct: number; period: 'day' | 'month' }> = [];
  for (const [api, q] of Object.entries(API_QUOTAS)) {
    const u = await getApiUsage(api);
    results.push({ api, ...u, period: q.period });
  }
  return results;
}
