// =============================================================================
// MIDAS — DeFiLlama Data Provider
// Recupere TVL, protocoles et donnees DeFi depuis DeFiLlama API (gratuit)
// =============================================================================

const DEFILLAMA_BASE = 'https://api.llama.fi';
const REQUEST_TIMEOUT_MS = 15000;

export interface ProtocolTVL {
  id: string;
  name: string;
  symbol: string;
  chain: string;
  chains: string[];
  tvl: number;
  change_1h: number | null;
  change_1d: number | null;
  change_7d: number | null;
  category: string;
  url: string;
  logo: string;
  mcap: number | null;
}

export interface ProtocolDetail {
  id: string;
  name: string;
  symbol: string;
  chain: string;
  chains: string[];
  tvl: Array<{ date: number; totalLiquidityUSD: number }>;
  currentChainTvls: Record<string, number>;
  category: string;
  url: string;
}

export interface ChainTVL {
  date: number;
  totalLiquidityUSD: number;
}

async function fetchDeFiLlama<T>(endpoint: string): Promise<T> {
  const url = `${DEFILLAMA_BASE}${endpoint}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown');
      throw new Error(
        `[MIDAS:DeFiLlama] HTTP ${response.status} sur ${endpoint}: ${body.slice(0, 200)}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `[MIDAS:DeFiLlama] Timeout sur ${endpoint} apres ${REQUEST_TIMEOUT_MS}ms`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Recupere la TVL actuelle d'un protocole specifique.
 * @param protocol - Slug du protocole (ex: 'aave', 'uniswap', 'lido')
 */
export async function getTVL(protocol: string): Promise<{
  name: string;
  tvl: number;
  chainTvls: Record<string, number>;
  history: Array<{ date: number; totalLiquidityUSD: number }>;
}> {
  const data = await fetchDeFiLlama<ProtocolDetail>(`/protocol/${protocol}`);

  const latestTvl =
    data.tvl.length > 0 ? data.tvl[data.tvl.length - 1].totalLiquidityUSD : 0;

  return {
    name: data.name,
    tvl: latestTvl,
    chainTvls: data.currentChainTvls ?? {},
    history: data.tvl,
  };
}

/**
 * Liste tous les protocoles DeFi avec leurs TVL.
 * @param limit - Nombre max de protocoles a retourner (defaut: 100)
 */
export async function getProtocols(limit: number = 100): Promise<ProtocolTVL[]> {
  const data = await fetchDeFiLlama<ProtocolTVL[]>('/protocols');

  return data
    .filter((p) => p.tvl > 0)
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, limit);
}

/**
 * Recupere la TVL historique d'une blockchain specifique.
 * @param chain - Nom de la chain (ex: 'Ethereum', 'Solana', 'Arbitrum')
 */
export async function getChainTVL(chain: string): Promise<{
  chain: string;
  currentTvl: number;
  history: ChainTVL[];
  change7d: number;
}> {
  const data = await fetchDeFiLlama<ChainTVL[]>(`/v2/historicalChainTvl/${chain}`);

  const currentTvl = data.length > 0 ? data[data.length - 1].totalLiquidityUSD : 0;
  const sevenDaysAgo =
    data.length >= 7 ? data[data.length - 7].totalLiquidityUSD : currentTvl;

  const change7d =
    sevenDaysAgo > 0 ? ((currentTvl - sevenDaysAgo) / sevenDaysAgo) * 100 : 0;

  return {
    chain,
    currentTvl,
    history: data,
    change7d,
  };
}

/**
 * Recupere les top protocoles par chain.
 */
export async function getTopProtocolsByChain(
  chain: string,
  limit: number = 20
): Promise<ProtocolTVL[]> {
  const protocols = await getProtocols(500);

  return protocols
    .filter((p) => p.chains.includes(chain))
    .slice(0, limit);
}

/**
 * Calcule un score DeFi global pour une analyse de marche.
 * TVL en hausse = bullish, en baisse = bearish.
 */
export function analyzeTVLTrend(
  history: Array<{ date: number; totalLiquidityUSD: number }>
): {
  trend: 'bullish' | 'bearish' | 'neutral';
  change24h: number;
  change7d: number;
  change30d: number;
} {
  if (history.length < 2) {
    return { trend: 'neutral', change24h: 0, change7d: 0, change30d: 0 };
  }

  const latest = history[history.length - 1].totalLiquidityUSD;
  const oneDayAgo = history.length >= 2 ? history[history.length - 2].totalLiquidityUSD : latest;
  const sevenDaysAgo =
    history.length >= 7 ? history[history.length - 7].totalLiquidityUSD : latest;
  const thirtyDaysAgo =
    history.length >= 30 ? history[history.length - 30].totalLiquidityUSD : latest;

  const change24h = oneDayAgo > 0 ? ((latest - oneDayAgo) / oneDayAgo) * 100 : 0;
  const change7d = sevenDaysAgo > 0 ? ((latest - sevenDaysAgo) / sevenDaysAgo) * 100 : 0;
  const change30d = thirtyDaysAgo > 0 ? ((latest - thirtyDaysAgo) / thirtyDaysAgo) * 100 : 0;

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (change7d > 5 && change24h > 0) {
    trend = 'bullish';
  } else if (change7d < -5 && change24h < 0) {
    trend = 'bearish';
  }

  return { trend, change24h, change7d, change30d };
}
