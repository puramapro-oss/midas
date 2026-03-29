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
 * Evenements crypto majeurs hardcodes en fallback si l'API est indisponible.
 */
function getFallbackEvents(): CryptoEvent[] {
  const now = new Date();
  const year = now.getFullYear();

  return [
    {
      id: 'fallback-btc-halving',
      title: 'Bitcoin Halving',
      coins: [{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' }],
      date_event: `${year + 2}-04-15`,
      categories: ['Halving'],
      source: 'Bitcoin protocol',
      is_hot: true,
      vote_count: 10000,
      positive_vote_count: 9500,
      confidence_pct: 100,
      description: 'Bitcoin block reward reduction from 3.125 to 1.5625 BTC',
    },
    {
      id: 'fallback-eth-upgrade',
      title: 'Ethereum Pectra Upgrade',
      coins: [{ id: 'ethereum', symbol: 'ETH', name: 'Ethereum' }],
      date_event: `${year}-05-07`,
      categories: ['Hard Fork', 'Upgrade'],
      source: 'Ethereum Foundation',
      is_hot: true,
      vote_count: 5000,
      positive_vote_count: 4200,
      confidence_pct: 90,
      description: 'Major Ethereum protocol upgrade with EIP-7702 account abstraction',
    },
    {
      id: 'fallback-sol-firedancer',
      title: 'Solana Firedancer Mainnet',
      coins: [{ id: 'solana', symbol: 'SOL', name: 'Solana' }],
      date_event: `${year}-06-01`,
      categories: ['Upgrade', 'Release'],
      source: 'Jump Crypto',
      is_hot: true,
      vote_count: 3000,
      positive_vote_count: 2700,
      confidence_pct: 75,
      description: 'New validator client by Jump Crypto for improved Solana performance',
    },
    {
      id: 'fallback-btc-etf-options',
      title: 'BTC ETF Options Expiry',
      coins: [{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' }],
      date_event: getNextMonthlyExpiry(now),
      categories: ['Options Expiry'],
      source: 'CBOE/CME',
      is_hot: false,
      vote_count: 2000,
      positive_vote_count: 1000,
      confidence_pct: 100,
      description: 'Monthly Bitcoin ETF options expiration date',
    },
    {
      id: 'fallback-fomc-meeting',
      title: 'FOMC Meeting (Fed Rate Decision)',
      coins: [
        { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
        { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
      ],
      date_event: getNextFOMC(now),
      categories: ['Macro', 'Regulation'],
      source: 'Federal Reserve',
      is_hot: true,
      vote_count: 8000,
      positive_vote_count: 4000,
      confidence_pct: 100,
      description: 'Federal Reserve interest rate decision — major market impact',
    },
  ];
}

function getNextMonthlyExpiry(fromDate: Date): string {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + 1);
  // Third Friday of the month
  d.setDate(1);
  let fridayCount = 0;
  while (fridayCount < 3) {
    if (d.getDay() === 5) fridayCount++;
    if (fridayCount < 3) d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

function getNextFOMC(fromDate: Date): string {
  // Approximate FOMC meeting dates (roughly every 6 weeks)
  const fomcDates2026 = [
    '2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17',
    '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16',
  ];
  const now = fromDate.toISOString().split('T')[0];
  const nextFomc = fomcDates2026.find((d) => d > now);
  return nextFomc ?? '2027-01-27';
}

/**
 * Recupere les evenements crypto a venir.
 * Fallback sur des evenements majeurs hardcodes si l'API est indisponible.
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
      return filterFallbackByCoins(getFallbackEvents(), coins);
    }

    return data.body.map(mapEvent);
  } catch {
    return filterFallbackByCoins(getFallbackEvents(), coins);
  }
}

function filterFallbackByCoins(
  events: CryptoEvent[],
  coins?: string[]
): CryptoEvent[] {
  if (!coins || coins.length === 0) return events;

  const upperCoins = coins.map((c) => c.toUpperCase());
  return events.filter((e) =>
    e.coins.some((c) => upperCoins.includes(c.symbol.toUpperCase()))
  );
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
