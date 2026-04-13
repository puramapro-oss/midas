// =============================================================================
// MIDAS — free-crypto-news Aggregator
// Source: cryptocurrency.cv (open source aggregator). Sans clé.
// Si l'endpoint est down → fallback automatique sur Reddit (déjà implémenté).
// =============================================================================

import { cacheGetOrSet } from '@/lib/cache/upstash';
import { getHotPosts } from '@/lib/data/reddit';

const FCN_BASE = 'https://cryptocurrency.cv/api';
const TIMEOUT_MS = 10000;

export interface CryptoNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: number;
}

async function fcnFetch<T>(path: string): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${FCN_BASE}${path}`, {
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

export async function fetchFreeCryptoNews(): Promise<CryptoNewsItem[]> {
  return cacheGetOrSet(
    'fcn:news',
    async () => {
      const data = await fcnFetch<{ articles?: CryptoNewsItem[] }>('/news');
      if (data?.articles && data.articles.length > 0) return data.articles;
      // Fallback : Reddit
      try {
        const posts = await getHotPosts('CryptoCurrency', 25);
        return posts.map((p) => ({
          title: p.title,
          url: p.url,
          source: `r/${p.subreddit}`,
          publishedAt: new Date(p.created_utc * 1000).toISOString(),
          sentiment: p.score >= 0 ? Math.min(100, p.score / 10) : Math.max(-100, p.score / 10),
        }));
      } catch {
        return [];
      }
    },
    300,
  );
}
