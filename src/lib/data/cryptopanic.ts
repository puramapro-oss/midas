// =============================================================================
// MIDAS — CryptoPanic News Provider
// Recupere les dernieres actualites crypto depuis CryptoPanic API
// =============================================================================

const CRYPTOPANIC_BASE = 'https://cryptopanic.com/api/free/v1';
const REQUEST_TIMEOUT_MS = 15000;

interface CryptoPanicSource {
  title: string;
  region: string;
  domain: string;
  path: string | null;
}

interface CryptoPanicCurrency {
  code: string;
  title: string;
  slug: string;
  url: string;
}

interface CryptoPanicVotes {
  negative: number;
  positive: number;
  important: number;
  liked: number;
  disliked: number;
  lol: number;
  toxic: number;
  saved: number;
  comments: number;
}

export interface CryptoPanicPost {
  kind: 'news' | 'media';
  domain: string;
  source: CryptoPanicSource;
  title: string;
  published_at: string;
  slug: string;
  id: number;
  url: string;
  created_at: string;
  currencies: CryptoPanicCurrency[] | null;
  votes: CryptoPanicVotes;
}

interface CryptoPanicResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CryptoPanicPost[];
}

function getApiToken(): string {
  const token = process.env.CRYPTOPANIC_API_KEY;
  if (!token) {
    throw new Error('[MIDAS:CryptoPanic] CRYPTOPANIC_API_KEY manquante');
  }
  return token;
}

async function fetchCryptoPanic<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${CRYPTOPANIC_BASE}${endpoint}`);
  url.searchParams.set('auth_token', getApiToken());
  url.searchParams.set('public', 'true');

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown');
      throw new Error(
        `[MIDAS:CryptoPanic] HTTP ${response.status} sur ${endpoint}: ${body.slice(0, 200)}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `[MIDAS:CryptoPanic] Timeout sur ${endpoint} apres ${REQUEST_TIMEOUT_MS}ms`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Recupere les dernieres news crypto.
 * @param currencies - Filtrer par codes devises (ex: 'BTC,ETH')
 * @param filter - Filtre optionnel: rising, hot, bullish, bearish, important, saved, lol
 * @param kind - Type de contenu: news ou media
 */
export async function getNews(options?: {
  currencies?: string;
  filter?: 'rising' | 'hot' | 'bullish' | 'bearish' | 'important' | 'saved' | 'lol';
  kind?: 'news' | 'media';
  regions?: string;
}): Promise<CryptoPanicPost[]> {
  const params: Record<string, string> = {};

  if (options?.currencies) params['currencies'] = options.currencies;
  if (options?.filter) params['filter'] = options.filter;
  if (options?.kind) params['kind'] = options.kind;
  if (options?.regions) params['regions'] = options.regions;

  const response = await fetchCryptoPanic<CryptoPanicResponse>('/posts/', params);
  return response.results;
}

/**
 * Calcule un score de sentiment a partir des votes des posts.
 * Retourne un score normalise entre -1 (tres bearish) et +1 (tres bullish).
 */
export function calculateNewsSentiment(posts: CryptoPanicPost[]): {
  score: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  total_posts: number;
} {
  if (posts.length === 0) {
    return { score: 0, bullish_count: 0, bearish_count: 0, neutral_count: 0, total_posts: 0 };
  }

  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  let weightedScore = 0;

  for (const post of posts) {
    const { positive, negative, important } = post.votes;
    const totalVotes = positive + negative;

    if (totalVotes === 0) {
      neutralCount++;
      continue;
    }

    const sentimentRatio = (positive - negative) / totalVotes;
    // Les posts importants ont plus de poids
    const weight = 1 + (important > 0 ? 0.5 : 0);

    if (sentimentRatio > 0.2) {
      bullishCount++;
    } else if (sentimentRatio < -0.2) {
      bearishCount++;
    } else {
      neutralCount++;
    }

    weightedScore += sentimentRatio * weight;
  }

  const normalizedScore = Math.max(-1, Math.min(1, weightedScore / posts.length));

  return {
    score: normalizedScore,
    bullish_count: bullishCount,
    bearish_count: bearishCount,
    neutral_count: neutralCount,
    total_posts: posts.length,
  };
}
