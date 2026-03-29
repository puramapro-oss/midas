// =============================================================================
// MIDAS — CoinGecko Data Provider
// Recupere prix, market data, historique et trending depuis CoinGecko API
// =============================================================================

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const REQUEST_TIMEOUT_MS = 15000;

interface CoinGeckoPrice {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_24h_vol?: number;
    usd_market_cap?: number;
    last_updated_at?: number;
  };
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  circulating_supply: number;
  total_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  atl: number;
  atl_change_percentage: number;
}

interface CoinGeckoHistoricalPrice {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

interface CoinGeckoTrendingCoin {
  item: {
    id: string;
    coin_id: number;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    score: number;
    data: {
      price: number;
      price_change_percentage_24h: Record<string, number>;
      market_cap: string;
      total_volume: string;
    };
  };
}

interface CoinGeckoTrendingResponse {
  coins: CoinGeckoTrendingCoin[];
}

async function fetchCoinGecko<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${COINGECKO_BASE}${endpoint}`);
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
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown');
      throw new Error(
        `[MIDAS:CoinGecko] HTTP ${response.status} sur ${endpoint}: ${body.slice(0, 200)}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`[MIDAS:CoinGecko] Timeout sur ${endpoint} apres ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Recupere le prix actuel d'un ou plusieurs coins.
 */
export async function getPrice(
  coinIds: string[],
  options?: { include24hChange?: boolean; includeVolume?: boolean; includeMarketCap?: boolean }
): Promise<CoinGeckoPrice> {
  const params: Record<string, string> = {
    ids: coinIds.join(','),
    vs_currencies: 'usd',
  };

  if (options?.include24hChange) params['include_24hr_change'] = 'true';
  if (options?.includeVolume) params['include_24hr_vol'] = 'true';
  if (options?.includeMarketCap) params['include_market_cap'] = 'true';
  params['include_last_updated_at'] = 'true';

  return fetchCoinGecko<CoinGeckoPrice>('/simple/price', params);
}

/**
 * Recupere les donnees de marche detaillees pour les coins specifies.
 */
export async function getMarketData(
  coinIds: string[],
  options?: { perPage?: number; page?: number; sparkline?: boolean }
): Promise<CoinGeckoMarketData[]> {
  return fetchCoinGecko<CoinGeckoMarketData[]>('/coins/markets', {
    vs_currency: 'usd',
    ids: coinIds.join(','),
    order: 'market_cap_desc',
    per_page: String(options?.perPage ?? 50),
    page: String(options?.page ?? 1),
    sparkline: String(options?.sparkline ?? false),
    price_change_percentage: '7d,30d',
  });
}

/**
 * Recupere l'historique des prix sur une periode donnee.
 * @param days - Nombre de jours (1, 7, 14, 30, 90, 180, 365, max)
 */
export async function getHistoricalPrices(
  coinId: string,
  days: number | 'max'
): Promise<CoinGeckoHistoricalPrice> {
  return fetchCoinGecko<CoinGeckoHistoricalPrice>(`/coins/${coinId}/market_chart`, {
    vs_currency: 'usd',
    days: String(days),
  });
}

/**
 * Recupere les coins trending sur CoinGecko.
 */
export async function getTrending(): Promise<CoinGeckoTrendingCoin[]> {
  const response = await fetchCoinGecko<CoinGeckoTrendingResponse>('/search/trending');
  return response.coins;
}

export type { CoinGeckoPrice, CoinGeckoMarketData, CoinGeckoHistoricalPrice, CoinGeckoTrendingCoin };
