// =============================================================================
// MIDAS — CoinMarketCap Provider
// 10K crédits/mois, 30 req/min. Header X-CMC_PRO_API_KEY.
// Cache Upstash : 60s pour quotes, 5min pour listings et global metrics.
// =============================================================================

import { cacheGetOrSet } from '@/lib/cache/upstash';

const CMC_BASE = 'https://pro-api.coinmarketcap.com';
const TIMEOUT_MS = 15000;

function getKey(): string | null {
  return process.env.COINMARKETCAP_API_KEY?.trim() || null;
}

async function cmcFetch<T>(path: string): Promise<T | null> {
  const key = getKey();
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${CMC_BASE}${path}`, {
      headers: {
        'X-CMC_PRO_API_KEY': key,
        Accept: 'application/json',
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return (json.data ?? null) as T | null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface CmcListing {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  num_market_pairs: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
      market_cap_dominance: number;
    };
  };
}

export async function fetchTopListings(limit = 100): Promise<CmcListing[]> {
  return cacheGetOrSet(
    `cmc:listings:${limit}`,
    async () => (await cmcFetch<CmcListing[]>(`/v1/cryptocurrency/listings/latest?limit=${limit}&convert=USD`)) ?? [],
    300,
  );
}

export async function fetchQuote(symbol: string): Promise<CmcListing | null> {
  return cacheGetOrSet(
    `cmc:quote:${symbol.toUpperCase()}`,
    async () => {
      const data = await cmcFetch<Record<string, CmcListing>>(`/v2/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}`);
      if (!data) return null;
      const first = Object.values(data)[0];
      return Array.isArray(first) ? first[0] ?? null : first ?? null;
    },
    60,
  );
}

export interface CmcGlobalMetrics {
  active_cryptocurrencies: number;
  total_cryptocurrencies: number;
  active_market_pairs: number;
  active_exchanges: number;
  btc_dominance: number;
  eth_dominance: number;
  quote: {
    USD: {
      total_market_cap: number;
      total_volume_24h: number;
      total_market_cap_yesterday_percentage_change: number;
    };
  };
}

export async function fetchGlobalMetrics(): Promise<CmcGlobalMetrics | null> {
  return cacheGetOrSet(
    'cmc:global',
    async () => cmcFetch<CmcGlobalMetrics>('/v1/global-metrics/quotes/latest?convert=USD'),
    300,
  );
}
