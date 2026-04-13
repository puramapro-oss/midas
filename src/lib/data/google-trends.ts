// =============================================================================
// MIDAS — Google Trends Provider
// Utilise l'endpoint public daily-trends de Google Trends (sans clé).
// Aucune dépendance npm. Cache 30min.
// Si Google Trends bloque (geo, captcha) → retourne null gracefully.
// =============================================================================

import { cacheGetOrSet } from '@/lib/cache/upstash';

const TIMEOUT_MS = 15000;

interface TrendItem {
  title: { query: string };
  formattedTraffic: string;
  relatedQueries?: Array<{ query: string }>;
  shareUrl?: string;
}

interface DailyTrendsResponse {
  default: {
    trendingSearchesDays: Array<{
      date: string;
      trendingSearches: TrendItem[];
    }>;
  };
}

/**
 * Récupère le score d'intérêt approximatif pour une keyword (0-100).
 * Heuristique : présence dans les daily trends + position.
 */
export async function getTrendScore(keyword: string, geo = 'US'): Promise<number | null> {
  return cacheGetOrSet(
    `trends:${geo}:${keyword.toLowerCase()}`,
    async () => {
      const url = `https://trends.google.com/trends/api/dailytrends?geo=${geo}&hl=en-US&ns=15`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
            Accept: 'application/json',
          },
          signal: ctrl.signal,
        });
        if (!res.ok) return null;
        const text = await res.text();
        // Google préfixe par )]}',\n
        const cleaned = text.replace(/^\)\]\}',?\s*/, '');
        const data = JSON.parse(cleaned) as DailyTrendsResponse;
        const all: TrendItem[] = [];
        for (const day of data.default?.trendingSearchesDays ?? []) {
          all.push(...day.trendingSearches);
        }
        const kw = keyword.toLowerCase();
        const idx = all.findIndex((it) => it.title.query.toLowerCase().includes(kw));
        if (idx === -1) return 0;
        // score: 100 si premier, dégrade linéairement
        const score = Math.max(0, 100 - idx * 5);
        return score;
      } catch {
        return null;
      } finally {
        clearTimeout(t);
      }
    },
    1800,
  );
}

export interface CryptoTrendSnapshot {
  bitcoin: number | null;
  ethereum: number | null;
  crypto: number | null;
  fomoIndex: number; // 0-100, agrégat
}

export async function fetchCryptoTrends(): Promise<CryptoTrendSnapshot> {
  const [bitcoin, ethereum, crypto] = await Promise.all([
    getTrendScore('bitcoin'),
    getTrendScore('ethereum'),
    getTrendScore('crypto'),
  ]);
  const values = [bitcoin, ethereum, crypto].filter((v): v is number => typeof v === 'number');
  const fomoIndex = values.length === 0 ? 0 : Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return { bitcoin, ethereum, crypto, fomoIndex };
}
