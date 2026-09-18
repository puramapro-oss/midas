// =============================================================================
// MIDAS — CoinMarketCal Events Provider
// Recupere les evenements crypto a venir depuis CoinMarketCal API
// =============================================================================

const COINMARKETCAL_BASE = 'https://developers.coinmarketcal.com/v1';
const REQUEST_TIMEOUT_MS = 15000;

export interface CryptoEvent {
  id: string;
  title: string;
  coins: Array<{ id: string; symbol: string; name: string }>;
  date_event: string;
  categories: string[];
  source: string;
  is_hot: boolean;
  vote_count: number;
  positive_vote_count: number;
  confidence_pct: number;
  description: string;
}

interface CoinMarketCalRawEvent {
  id: number;
  title: { en: string };
  coins: Array<{ id: string; symbol: string; name: string }>;
  date_event: string;
  categories: Array<{ id: number; name: string }>;
  source: string;
  is_hot: boolean;
  vote_count: number;
  positive_vote_count: number;
  percentage: number;
  description: { en: string };
}

interface CoinMarketCalResponse {
  status: { error_code: number; error_message: string };
  body: CoinMarketCalRawEvent[];
}

function getApiKey(): string {
  const key = process.env.COINMARKETCAL_API_KEY;
  if (!key) {
    throw new Error('[MIDAS:CoinMarketCal] COINMARKETCAL_API_KEY manquante');
  }
  return key;
}

function mapEvent(raw: CoinMarketCalRawEvent): CryptoEvent {
  return {
    id: String(raw.id),
    title: raw.title.en,
    coins: raw.coins,
    date_event: raw.date_event,
    categories: raw.categories.map((c) => c.name),
    source: raw.source,
    is_hot: raw.is_hot,
    vote_count: raw.vote_count,
    positive_vote_count: raw.positive_vote_count,
    confidence_pct: raw.percentage,
    description: raw.description.en,
  };
}

async function fetchCoinMarketCal<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${COINMARKETCAL_BASE}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'x-api-key': getApiKey(),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown');
      throw new Error(
        `[MIDAS:CoinMarketCal] HTTP ${response.status} sur ${endpoint}: ${body.slice(0, 200)}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `[MIDAS:CoinMarketCal] Timeout sur ${endpoint} apres ${REQUEST_TIMEOUT_MS}ms`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Recupere les evenements crypto a venir.
 * Retourne une liste vide si l'API est indisponible: aucune donnee inventee.
 * @param coins - Filtrer par symboles (ex: ['BTC', 'ETH'])
 */
export async function getUpcomingEvents(coins?: string[]): Promise<CryptoEvent[]> {
  try {
    const params: Record<string, string> = {
      max: '50',
      dateRangeStart: new Date().toISOString().split('T')[0],
      dateRangeEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      showOnly: 'hot_events',
    };

    if (coins && coins.length > 0) {
      params['coins'] = coins.join(',');
    }

    const data = await fetchCoinMarketCal<CoinMarketCalResponse>('/events', params);

    if (!data.body || data.body.length === 0) {
      return [];
    }

    return data.body.map(mapEvent);
  } catch {
    return [];
  }
}

/**
 * Evalue l'impact potentiel d'un evenement sur le prix.
 */
export function assessEventImpact(event: CryptoEvent): {
  impact: 'high' | 'medium' | 'low';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  daysUntil: number;
} {
  const daysUntil = Math.max(
    0,
    Math.floor(
      (new Date(event.date_event).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  const highImpactCategories = ['Halving', 'Hard Fork', 'Upgrade', 'Regulation', 'Macro'];
  const bearishCategories = ['Token Burn', 'Delisting', 'Regulation'];

  const isHighImpact =
    event.categories.some((c) => highImpactCategories.includes(c)) || event.is_hot;
  const isBearish = event.categories.some((c) => bearishCategories.includes(c));

  const positiveRatio =
    event.vote_count > 0 ? event.positive_vote_count / event.vote_count : 0.5;

  let impact: 'high' | 'medium' | 'low' = 'low';
  if (isHighImpact || event.confidence_pct > 80) {
    impact = 'high';
  } else if (event.vote_count > 500 || event.confidence_pct > 50) {
    impact = 'medium';
  }

  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (isBearish || positiveRatio < 0.3) {
    sentiment = 'bearish';
  } else if (positiveRatio > 0.6) {
    sentiment = 'bullish';
  }

  return { impact, sentiment, daysUntil };
}
