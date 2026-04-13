// =============================================================================
// MIDAS — CoinPaprika Provider (sans clé)
// 20K calls/mois. Cache Upstash 60-300s.
// =============================================================================

import { cacheGetOrSet } from '@/lib/cache/upstash';

const PAPRIKA_BASE = 'https://api.coinpaprika.com/v1';
const TIMEOUT_MS = 15000;

async function paprikaFetch<T>(path: string): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${PAPRIKA_BASE}${path}`, {
      headers: { Accept: 'application/json' },
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

export interface PaprikaTicker {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  beta_value: number;
  last_updated: string;
  quotes: {
    USD: {
      price: number;
      volume_24h: number;
      volume_24h_change_24h: number;
      market_cap: number;
      market_cap_change_24h: number;
      percent_change_15m: number;
      percent_change_30m: number;
      percent_change_1h: number;
      percent_change_6h: number;
      percent_change_12h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      percent_change_1y: number;
      ath_price: number;
      ath_date: string;
      percent_from_price_ath: number;
    };
  };
}

export async function fetchTickers(): Promise<PaprikaTicker[]> {
  return cacheGetOrSet(
    'paprika:tickers',
    async () => (await paprikaFetch<PaprikaTicker[]>('/tickers')) ?? [],
    120,
  );
}

export async function fetchTickerById(id: string): Promise<PaprikaTicker | null> {
  return cacheGetOrSet(
    `paprika:ticker:${id}`,
    async () => paprikaFetch<PaprikaTicker>(`/tickers/${id}`),
    60,
  );
}

export interface PaprikaEvent {
  id: string;
  date: string;
  date_to: string | null;
  name: string;
  description: string;
  is_conference: boolean;
  link: string;
  proof_image_link: string;
}

export async function fetchEvents(coinId: string): Promise<PaprikaEvent[]> {
  return cacheGetOrSet(
    `paprika:events:${coinId}`,
    async () => (await paprikaFetch<PaprikaEvent[]>(`/coins/${coinId}/events`)) ?? [],
    3600,
  );
}

export interface PaprikaTweet {
  date: string;
  user_name: string;
  user_image_link: string;
  status: string;
  is_retweet: boolean;
  retweet_count: number;
  like_count: number;
  status_link: string;
  status_id: string;
}

export async function fetchTwitter(coinId: string): Promise<PaprikaTweet[]> {
  return cacheGetOrSet(
    `paprika:twitter:${coinId}`,
    async () => (await paprikaFetch<PaprikaTweet[]>(`/coins/${coinId}/twitter`)) ?? [],
    600,
  );
}
