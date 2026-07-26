// =============================================================================
// MIDAS — free-crypto-news Aggregator
// Source: cryptocurrency.cv (agrégateur open source, 200+ sources). Sans clé.
// Si l'endpoint est down → fallback automatique sur Reddit (déjà implémenté).
// =============================================================================

import { cacheGetOrSet } from '@/lib/cache/upstash';
import { getHotPosts } from '@/lib/data/reddit';

const FCN_BASE = 'https://cryptocurrency.cv/api';
const TIMEOUT_MS = 10000;
// cryptocurrency.cv bloque les user-agents "bot" par défaut (curl, fetch sans UA) — nécessaire.
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface CryptoNewsItem {
  title: string;
  link: string;
  description: string;
  source: string;
  publishedAt: string;
}

interface FcnArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

async function fcnFetch<T>(path: string): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${FCN_BASE}${path}`, {
      headers: { Accept: 'application/json', 'User-Agent': BROWSER_USER_AGENT },
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

/**
 * Recupere les dernieres actualites crypto (categorie optionnelle : bitcoin, defi, nft...).
 * Note : cryptocurrency.cv ne fournit pas de score de sentiment sur son offre gratuite
 * (l'endpoint /api/search avec filtre sentiment est payant via x402) — les headlines
 * servent uniquement de matiere premiere a l'analyse Claude en aval.
 */
export async function fetchFreeCryptoNews(category?: string): Promise<CryptoNewsItem[]> {
  const cacheKey = category ? `fcn:news:${category}` : 'fcn:news';
  return cacheGetOrSet(
    cacheKey,
    async () => {
      const path = category ? `/news?category=${encodeURIComponent(category)}&limit=30` : '/news?limit=30';
      const data = await fcnFetch<{ articles?: FcnArticle[] }>(path);
      if (data?.articles && data.articles.length > 0) {
        return data.articles.map((a) => ({
          title: a.title,
          link: a.link,
          description: a.description,
          source: a.source,
          publishedAt: a.pubDate,
        }));
      }
      // Fallback : Reddit
      try {
        const posts = await getHotPosts('CryptoCurrency', 25);
        return posts.map((p) => ({
          title: p.title,
          link: p.url,
          description: '',
          source: `r/${p.subreddit}`,
          publishedAt: new Date(p.created_utc * 1000).toISOString(),
        }));
      } catch {
        return [];
      }
    },
    300,
  );
}

/** Mappe un symbole de paire vers la categorie cryptocurrency.cv la plus pertinente (si connue). */
export function coinToNewsCategory(coin: string): string | undefined {
  const map: Record<string, string> = { BTC: 'bitcoin', ETH: 'defi', SOL: 'defi' };
  return map[coin.toUpperCase()];
}
