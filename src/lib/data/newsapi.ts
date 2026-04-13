// =============================================================================
// MIDAS — NewsAPI Provider
// 100 req/jour (free tier). Header X-Api-Key. Cache 5min.
// Détection mots-clés bullish/bearish pour scoring sentiment.
// =============================================================================

import { cacheGetOrSet } from '@/lib/cache/upstash';

const NEWS_BASE = 'https://newsapi.org/v2';
const TIMEOUT_MS = 15000;

function getKey(): string | null {
  return process.env.NEWSAPI_API_KEY?.trim() || null;
}

const BULLISH_KEYWORDS = [
  'etf approved', 'adoption', 'partnership', 'integration', 'institutional',
  'all-time high', 'rally', 'surge', 'breakout', 'bullish', 'accumulation',
  'halving', 'upgrade', 'mainnet launch',
];

const BEARISH_KEYWORDS = [
  'ban', 'banned', 'hack', 'hacked', 'exploit', 'rug pull', 'sec lawsuit',
  'regulation', 'crackdown', 'bearish', 'crash', 'dump', 'liquidation',
  'bankruptcy', 'fraud', 'scam',
];

export interface NewsArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface NewsScored {
  articles: NewsArticle[];
  sentimentScore: number; // -100..+100
  bullishCount: number;
  bearishCount: number;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const key = getKey();
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'X-Api-Key': key, Accept: 'application/json' },
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

function scoreText(text: string): { bull: number; bear: number } {
  const t = text.toLowerCase();
  let bull = 0;
  let bear = 0;
  for (const k of BULLISH_KEYWORDS) if (t.includes(k)) bull += 1;
  for (const k of BEARISH_KEYWORDS) if (t.includes(k)) bear += 1;
  return { bull, bear };
}

export async function fetchCryptoNews(query = 'bitcoin OR crypto', pageSize = 50): Promise<NewsScored> {
  return cacheGetOrSet(
    `newsapi:${query}:${pageSize}`,
    async () => {
      const url = `${NEWS_BASE}/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${pageSize}`;
      const data = await fetchJson<{ status: string; articles?: NewsArticle[] }>(url);
      const articles = data?.articles ?? [];
      let bull = 0;
      let bear = 0;
      for (const a of articles) {
        const text = `${a.title ?? ''} ${a.description ?? ''}`;
        const s = scoreText(text);
        bull += s.bull;
        bear += s.bear;
      }
      const total = bull + bear;
      const sentimentScore = total === 0 ? 0 : Math.round(((bull - bear) / total) * 100);
      return { articles, sentimentScore, bullishCount: bull, bearishCount: bear };
    },
    300,
  );
}
