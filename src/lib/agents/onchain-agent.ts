// =============================================================================
// MIDAS — On-Chain Analysis Agent
// Analyse les donnees on-chain via CoinGecko (volume, market cap, tendances)
// =============================================================================

import type { AgentResult } from '@/lib/agents/types';
import { getMarketData, getHistoricalPrices, type CoinGeckoMarketData } from '@/lib/data/coingecko';

// --- Types ---

interface OnChainData {
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume_24h: number;
  volume_to_market_cap_ratio: number;
  price_change_24h_pct: number;
  price_change_7d_pct: number;
  price_change_30d_pct: number;
  ath_distance_pct: number;
  atl_distance_pct: number;
  volume_trend: 'increasing' | 'decreasing' | 'stable';
  volume_anomaly: boolean;
  supply_ratio: number | null;
  signals: OnChainSignal[];
}

interface OnChainSignal {
  name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  description: string;
}

// --- Constants ---

const COIN_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  DOGE: 'dogecoin',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  NEAR: 'near',
  ARB: 'arbitrum',
  OP: 'optimism',
  APT: 'aptos',
  SUI: 'sui',
  FIL: 'filecoin',
  AAVE: 'aave',
  MKR: 'maker',
  INJ: 'injective-protocol',
  TIA: 'celestia',
  SEI: 'sei-network',
};

// --- Helpers ---

function extractCoinSymbol(pair: string): string {
  const slash = pair.indexOf('/');
  return slash > 0 ? pair.substring(0, slash) : pair;
}

function getCoinGeckoId(symbol: string): string {
  return COIN_ID_MAP[symbol.toUpperCase()] ?? symbol.toLowerCase();
}

function analyzeVolumeTrend(
  volumes: [number, number][]
): { trend: 'increasing' | 'decreasing' | 'stable'; anomaly: boolean } {
  if (volumes.length < 7) {
    return { trend: 'stable', anomaly: false };
  }

  // Comparer derniers 3 jours vs 7 jours avant
  const recentVolumes = volumes.slice(-3).map(([, v]) => v);
  const olderVolumes = volumes.slice(-10, -3).map(([, v]) => v);

  const recentAvg = recentVolumes.reduce((s, v) => s + v, 0) / recentVolumes.length;
  const olderAvg = olderVolumes.length > 0
    ? olderVolumes.reduce((s, v) => s + v, 0) / olderVolumes.length
    : recentAvg;

  const changeRatio = olderAvg > 0 ? recentAvg / olderAvg : 1;

  const trend: 'increasing' | 'decreasing' | 'stable' =
    changeRatio > 1.3 ? 'increasing' : changeRatio < 0.7 ? 'decreasing' : 'stable';

  // Anomalie si volume 3x plus que moyenne
  const allVolumes = volumes.map(([, v]) => v);
  const overallAvg = allVolumes.reduce((s, v) => s + v, 0) / allVolumes.length;
  const latestVolume = allVolumes[allVolumes.length - 1];
  const anomaly = latestVolume > overallAvg * 3;

  return { trend, anomaly };
}

function generateSignals(
  marketData: CoinGeckoMarketData,
  volumeTrend: { trend: string; anomaly: boolean },
  volumeToMcapRatio: number
): OnChainSignal[] {
  const signals: OnChainSignal[] = [];

  // --- Price momentum signals ---

  const pct24h = marketData.price_change_percentage_24h ?? 0;
  const pct7d = marketData.price_change_percentage_7d_in_currency ?? 0;
  const pct30d = marketData.price_change_percentage_30d_in_currency ?? 0;

  // 24h momentum
  if (pct24h > 5) {
    signals.push({
      name: 'momentum_24h',
      signal: 'bullish',
      weight: 0.15,
      description: `Hausse 24h de ${pct24h.toFixed(1)}% — fort momentum court terme`,
    });
  } else if (pct24h < -5) {
    signals.push({
      name: 'momentum_24h',
      signal: 'bearish',
      weight: 0.15,
      description: `Baisse 24h de ${pct24h.toFixed(1)}% — pression vendeuse`,
    });
  }

  // 7d trend
  if (pct7d > 10) {
    signals.push({
      name: 'trend_7d',
      signal: 'bullish',
      weight: 0.20,
      description: `Tendance 7j haussiere (+${pct7d.toFixed(1)}%)`,
    });
  } else if (pct7d < -10) {
    signals.push({
      name: 'trend_7d',
      signal: 'bearish',
      weight: 0.20,
      description: `Tendance 7j baissiere (${pct7d.toFixed(1)}%)`,
    });
  }

  // 30d macro trend
  if (pct30d > 20) {
    signals.push({
      name: 'macro_trend_30d',
      signal: 'bullish',
      weight: 0.20,
      description: `Tendance macro 30j fortement haussiere (+${pct30d.toFixed(1)}%)`,
    });
  } else if (pct30d < -20) {
    signals.push({
      name: 'macro_trend_30d',
      signal: 'bearish',
      weight: 0.20,
      description: `Tendance macro 30j fortement baissiere (${pct30d.toFixed(1)}%)`,
    });
  }

  // --- Volume signals ---

  if (volumeTrend.anomaly) {
    signals.push({
      name: 'volume_anomaly',
      signal: pct24h > 0 ? 'bullish' : 'bearish',
      weight: 0.15,
      description: `Volume anormal detecte — ${pct24h > 0 ? 'accumulation potentielle' : 'distribution potentielle'}`,
    });
  }

  if (volumeTrend.trend === 'increasing' && pct24h > 0) {
    signals.push({
      name: 'volume_confirmation',
      signal: 'bullish',
      weight: 0.10,
      description: 'Volume croissant confirme la hausse des prix',
    });
  } else if (volumeTrend.trend === 'increasing' && pct24h < 0) {
    signals.push({
      name: 'volume_selling',
      signal: 'bearish',
      weight: 0.10,
      description: 'Volume croissant accompagne la baisse — pression vendeuse',
    });
  } else if (volumeTrend.trend === 'decreasing' && pct24h > 0) {
    signals.push({
      name: 'volume_divergence',
      signal: 'bearish',
      weight: 0.10,
      description: 'Hausse sur volume decroissant — divergence baissiere',
    });
  }

  // Volume / Market cap ratio
  if (volumeToMcapRatio > 0.15) {
    signals.push({
      name: 'high_activity',
      signal: 'neutral',
      weight: 0.10,
      description: `Ratio volume/mcap eleve (${(volumeToMcapRatio * 100).toFixed(1)}%) — forte activite`,
    });
  }

  // --- ATH/ATL distance ---

  const athDistance = marketData.ath_change_percentage ?? 0;
  const atlDistance = marketData.atl_change_percentage ?? 0;

  if (athDistance > -10) {
    signals.push({
      name: 'near_ath',
      signal: 'bearish',
      weight: 0.10,
      description: `Proche ATH (${athDistance.toFixed(1)}%) — resistance potentielle`,
    });
  }

  if (atlDistance < 50 && atlDistance > 0) {
    signals.push({
      name: 'near_atl',
      signal: 'bullish',
      weight: 0.10,
      description: `Proche ATL (+${atlDistance.toFixed(1)}%) — support potentiel`,
    });
  }

  // --- Supply signal ---

  if (marketData.circulating_supply && marketData.total_supply) {
    const supplyRatio = marketData.circulating_supply / marketData.total_supply;
    if (supplyRatio < 0.4) {
      signals.push({
        name: 'low_circulating_supply',
        signal: 'bearish',
        weight: 0.05,
        description: `Seulement ${(supplyRatio * 100).toFixed(0)}% en circulation — risque dilution`,
      });
    }
  }

  return signals;
}

// --- Main Agent Function ---

/**
 * Analyse les donnees on-chain d'une paire via CoinGecko.
 */
export async function analyzeOnChain(pair: string): Promise<AgentResult> {
  const symbol = extractCoinSymbol(pair);
  const coinId = getCoinGeckoId(symbol);

  // Fetch data en parallele
  const [marketDataResult, historicalResult] = await Promise.allSettled([
    getMarketData([coinId]),
    getHistoricalPrices(coinId, 30),
  ]);

  if (marketDataResult.status === 'rejected') {
    return {
      agent_name: 'onchain',
      signal: 'neutral',
      score: 0,
      confidence: 0,
      reasoning: `Impossible de recuperer les donnees CoinGecko pour ${symbol}: ${marketDataResult.reason}`,
      data: { error: 'fetch_failed', coin_id: coinId },
      timestamp: new Date(),
    };
  }

  const marketDataList = marketDataResult.value;
  if (marketDataList.length === 0) {
    return {
      agent_name: 'onchain',
      signal: 'neutral',
      score: 0,
      confidence: 0,
      reasoning: `Aucune donnee CoinGecko trouvee pour ${coinId}`,
      data: { error: 'no_data', coin_id: coinId },
      timestamp: new Date(),
    };
  }

  const market = marketDataList[0];
  const historical = historicalResult.status === 'fulfilled' ? historicalResult.value : null;

  // Volume trend
  const volumeData = historical?.total_volumes ?? [];
  const volumeTrend = analyzeVolumeTrend(volumeData);

  // Volume / Market cap ratio
  const volumeToMcapRatio = market.market_cap > 0
    ? market.total_volume / market.market_cap
    : 0;

  // Supply ratio
  const supplyRatio = market.total_supply
    ? market.circulating_supply / market.total_supply
    : null;

  // Generate signals
  const onchainSignals = generateSignals(market, volumeTrend, volumeToMcapRatio);

  // Composite score from signals
  let totalBullish = 0;
  let totalBearish = 0;
  let totalWeight = 0;

  for (const sig of onchainSignals) {
    totalWeight += sig.weight;
    if (sig.signal === 'bullish') {
      totalBullish += sig.weight;
    } else if (sig.signal === 'bearish') {
      totalBearish += sig.weight;
    }
  }

  const compositeScore = totalWeight > 0
    ? (totalBullish - totalBearish) / totalWeight
    : 0;

  // Signal
  let signal: AgentResult['signal'];
  if (compositeScore > 0.15) {
    signal = 'bullish';
  } else if (compositeScore < -0.15) {
    signal = 'bearish';
  } else {
    signal = 'neutral';
  }

  // Confidence based on data quality
  const hasHistorical = historical !== null;
  const hasVolume = market.total_volume > 0;
  const signalCount = onchainSignals.length;
  const confidence = Math.min(
    0.85,
    0.3 + (hasHistorical ? 0.2 : 0) + (hasVolume ? 0.1 : 0) + signalCount * 0.05
  );

  // Reasoning
  const reasoningParts = [
    `On-chain ${pair} — Prix: $${market.current_price.toLocaleString()} | MCap Rank: #${market.market_cap_rank}`,
    `Volume 24h: $${market.total_volume.toLocaleString()} | Ratio V/MC: ${(volumeToMcapRatio * 100).toFixed(2)}%`,
    `Variations: 24h ${(market.price_change_percentage_24h ?? 0).toFixed(1)}% | 7j ${(market.price_change_percentage_7d_in_currency ?? 0).toFixed(1)}% | 30j ${(market.price_change_percentage_30d_in_currency ?? 0).toFixed(1)}%`,
    `Volume trend: ${volumeTrend.trend}${volumeTrend.anomaly ? ' (ANOMALIE)' : ''}`,
    `Signaux: ${onchainSignals.map((s) => `${s.name}(${s.signal})`).join(', ')}`,
  ];

  const onchainData: OnChainData = {
    current_price: market.current_price,
    market_cap: market.market_cap,
    market_cap_rank: market.market_cap_rank,
    total_volume_24h: market.total_volume,
    volume_to_market_cap_ratio: volumeToMcapRatio,
    price_change_24h_pct: market.price_change_percentage_24h ?? 0,
    price_change_7d_pct: market.price_change_percentage_7d_in_currency ?? 0,
    price_change_30d_pct: market.price_change_percentage_30d_in_currency ?? 0,
    ath_distance_pct: market.ath_change_percentage,
    atl_distance_pct: market.atl_change_percentage,
    volume_trend: volumeTrend.trend,
    volume_anomaly: volumeTrend.anomaly,
    supply_ratio: supplyRatio,
    signals: onchainSignals,
  };

  return {
    agent_name: 'onchain',
    signal,
    score: compositeScore,
    confidence,
    reasoning: reasoningParts.join('\n'),
    data: onchainData as unknown as Record<string, unknown>,
    timestamp: new Date(),
  };
}
