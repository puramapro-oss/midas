// =============================================================================
// MIDAS — On-Chain Analysis Agent
// Sources: Binance Futures (OI, funding, long/short, whales), DefiLlama (TVL),
//          Etherscan (gas oracle, ETH price), Dune (queries) — conforme brief.
// Whales > 100K$, liquidations cascade, funding extreme, TVL momentum.
// =============================================================================

import type { AgentResult } from '@/lib/agents/types';
import { getAdvancedData, analyzeFuturesSentiment, type BinanceAdvancedData } from '@/lib/exchange/binance-advanced';
import { getTVL, analyzeTVLTrend } from '@/lib/data/defillama';
import { fetchEthPrice, fetchGasOracle } from '@/lib/data/etherscan';
import { fetchWhaleTrades } from '@/lib/data/binance';

interface OnChainSignal {
  name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  description: string;
}

interface OnChainData {
  futures: {
    openInterest: number | null;
    fundingRate: number | null;
    topLongShortRatio: number | null;
    globalLongShortRatio: number | null;
    sentiment: { signal: string; confidence: number; reasons: string[] };
  };
  whales: {
    count: number;
    buy_volume_usd: number;
    sell_volume_usd: number;
    net_flow_usd: number;
  };
  defi: {
    tvl_change_7d_pct: number;
    tvl_trend: 'bullish' | 'bearish' | 'neutral';
    protocol_name: string | null;
  };
  ethereum: {
    eth_price_usd: number | null;
    gas_gwei: number | null;
    activity_level: 'low' | 'medium' | 'high';
  };
  signals: OnChainSignal[];
}

const TVL_PROTOCOL_MAP: Record<string, string> = {
  ETH: 'lido',
  BTC: 'wbtc',
  SOL: 'jito-liquid-staking',
  AVAX: 'benqi-lending',
  MATIC: 'aave-v3',
  ARB: 'gmx',
  OP: 'velodrome',
};

function extractCoinSymbol(pair: string): string {
  const slash = pair.indexOf('/');
  return slash > 0 ? pair.substring(0, slash) : pair;
}

function pairToBinanceSymbol(pair: string): string {
  return pair.replace('/', '').toUpperCase();
}

function classifyGas(gwei: number): 'low' | 'medium' | 'high' {
  if (gwei < 20) return 'low';
  if (gwei < 60) return 'medium';
  return 'high';
}

function buildSignals(
  futures: BinanceAdvancedData,
  whaleNet: number,
  whaleCount: number,
  tvl: { trend: 'bullish' | 'bearish' | 'neutral'; change7d: number },
  ethActivity: 'low' | 'medium' | 'high',
): OnChainSignal[] {
  const signals: OnChainSignal[] = [];

  // Funding rate (brief : >0.001 = danger, <-0.0005 = opportunité)
  if (futures.fundingRate) {
    const fr = futures.fundingRate.fundingRate;
    if (fr > 0.001) {
      signals.push({
        name: 'funding_extreme_long',
        signal: 'bearish',
        weight: 0.20,
        description: `Funding rate +${(fr * 100).toFixed(3)}% — marché trop bullish, danger de squeeze`,
      });
    } else if (fr < -0.0005) {
      signals.push({
        name: 'funding_extreme_short',
        signal: 'bullish',
        weight: 0.20,
        description: `Funding rate ${(fr * 100).toFixed(3)}% — opportunité contrarian`,
      });
    }
  }

  // Open Interest signal (qualité de tendance)
  if (futures.openInterest && futures.ticker24h) {
    const priceChange = futures.ticker24h.priceChangePercent;
    if (priceChange > 1 && futures.openInterest.openInterest > 0) {
      signals.push({
        name: 'oi_price_alignment',
        signal: 'bullish',
        weight: 0.10,
        description: `OI + prix montent ensemble — tendance saine (+${priceChange.toFixed(1)}%)`,
      });
    } else if (priceChange < -1 && futures.openInterest.openInterest > 0) {
      signals.push({
        name: 'oi_price_divergence',
        signal: 'bullish',
        weight: 0.10,
        description: `OI monte avec prix qui baisse — short squeeze potentiel`,
      });
    }
  }

  // Long/Short ratio top traders (suiveur de smart money)
  if (futures.topLongShortRatio) {
    const longPct = futures.topLongShortRatio.longAccount;
    if (longPct > 0.65) {
      signals.push({
        name: 'top_traders_long',
        signal: 'bullish',
        weight: 0.10,
        description: `${(longPct * 100).toFixed(0)}% des top traders long`,
      });
    } else if (longPct < 0.35) {
      signals.push({
        name: 'top_traders_short',
        signal: 'bearish',
        weight: 0.10,
        description: `${((1 - longPct) * 100).toFixed(0)}% des top traders short`,
      });
    }
  }

  // Global retail (contrarian)
  if (futures.globalRatio) {
    const retailLong = futures.globalRatio.longAccount;
    if (retailLong > 0.7) {
      signals.push({
        name: 'retail_overlong',
        signal: 'bearish',
        weight: 0.08,
        description: 'Retail massivement long — contrarian bearish',
      });
    } else if (retailLong < 0.3) {
      signals.push({
        name: 'retail_overshort',
        signal: 'bullish',
        weight: 0.08,
        description: 'Retail massivement short — contrarian bullish',
      });
    }
  }

  // Whales (>100K$ par trade)
  if (whaleCount > 0) {
    if (whaleNet > 0) {
      signals.push({
        name: 'whale_accumulation',
        signal: 'bullish',
        weight: 0.15,
        description: `${whaleCount} whales — accumulation nette $${whaleNet.toLocaleString()}`,
      });
    } else if (whaleNet < 0) {
      signals.push({
        name: 'whale_distribution',
        signal: 'bearish',
        weight: 0.15,
        description: `${whaleCount} whales — distribution nette $${Math.abs(whaleNet).toLocaleString()}`,
      });
    }
  }

  // TVL DeFi
  if (tvl.change7d > 20) {
    signals.push({
      name: 'tvl_explosion',
      signal: 'bullish',
      weight: 0.12,
      description: `TVL DeFi +${tvl.change7d.toFixed(1)}% sur 7j — adoption forte`,
    });
  } else if (tvl.change7d < -20) {
    signals.push({
      name: 'tvl_drain',
      signal: 'bearish',
      weight: 0.12,
      description: `TVL DeFi ${tvl.change7d.toFixed(1)}% sur 7j — exit massif`,
    });
  }

  // Ethereum gas (proxy d'activité)
  if (ethActivity === 'high') {
    signals.push({
      name: 'eth_high_activity',
      signal: 'bullish',
      weight: 0.05,
      description: 'Gas Ethereum élevé — forte activité on-chain',
    });
  }

  return signals;
}

export async function analyzeOnChain(pair: string): Promise<AgentResult> {
  const symbol = extractCoinSymbol(pair);
  const binanceSymbol = pairToBinanceSymbol(pair);

  // 4 sources en parallèle (résilient)
  const [futuresRes, whalesRes, tvlRes, ethPriceRes, gasRes] = await Promise.allSettled([
    getAdvancedData(pair),
    fetchWhaleTrades(binanceSymbol, 100_000),
    (async () => {
      const protocolSlug = TVL_PROTOCOL_MAP[symbol.toUpperCase()];
      if (!protocolSlug) return null;
      return getTVL(protocolSlug);
    })(),
    fetchEthPrice(),
    fetchGasOracle(),
  ]);

  // Futures
  const futures: BinanceAdvancedData =
    futuresRes.status === 'fulfilled'
      ? futuresRes.value
      : {
          openInterest: null,
          fundingRate: null,
          topLongShortRatio: null,
          takerRatio: null,
          globalRatio: null,
          orderBookWalls: { bids: [], asks: [] },
          whaleTransactions: [],
          ticker24h: null,
        };

  const futuresSentiment = analyzeFuturesSentiment(futures);

  // Whales
  const whales = whalesRes.status === 'fulfilled' ? whalesRes.value : [];
  const buyWhales = whales.filter((w) => !w.isBuyerMaker);
  const sellWhales = whales.filter((w) => w.isBuyerMaker);
  const buyVolume = buyWhales.reduce((s, w) => s + w.quoteQty, 0);
  const sellVolume = sellWhales.reduce((s, w) => s + w.quoteQty, 0);
  const whaleNet = buyVolume - sellVolume;

  // DeFi TVL
  const tvlData = tvlRes.status === 'fulfilled' ? tvlRes.value : null;
  const tvlAnalysis = tvlData?.history
    ? analyzeTVLTrend(
        tvlData.history.map((h) => ({
          date: h.date,
          totalLiquidityUSD: h.totalLiquidityUSD,
        })),
      )
    : { trend: 'neutral' as const, change24h: 0, change7d: 0, change30d: 0 };

  // Ethereum
  const ethPrice = ethPriceRes.status === 'fulfilled' && ethPriceRes.value ? Number(ethPriceRes.value.ethusd) : null;
  const gas = gasRes.status === 'fulfilled' && gasRes.value ? Number(gasRes.value.ProposeGasPrice) : null;
  const ethActivity = gas !== null ? classifyGas(gas) : 'medium';

  // Build signals
  const signals = buildSignals(futures, whaleNet, whales.length, tvlAnalysis, ethActivity);

  // Composite score
  let bullWeight = 0;
  let bearWeight = 0;
  let totalWeight = 0;
  for (const s of signals) {
    totalWeight += s.weight;
    if (s.signal === 'bullish') bullWeight += s.weight;
    else if (s.signal === 'bearish') bearWeight += s.weight;
  }
  const compositeScore = totalWeight > 0 ? (bullWeight - bearWeight) / totalWeight : 0;

  let signal: AgentResult['signal'] = 'neutral';
  if (compositeScore > 0.15) signal = 'bullish';
  else if (compositeScore < -0.15) signal = 'bearish';

  // Confidence
  const sourceCount =
    (futuresRes.status === 'fulfilled' ? 1 : 0) +
    (whales.length > 0 ? 1 : 0) +
    (tvlData ? 1 : 0) +
    (ethPrice !== null ? 1 : 0);
  const confidence = Math.min(0.9, 0.3 + sourceCount * 0.15 + signals.length * 0.03);

  // Reasoning
  const reasoningParts = [
    `On-chain ${pair} — Futures: ${futuresSentiment.signal} (${(futuresSentiment.confidence * 100).toFixed(0)}%)`,
    `Whales: ${whales.length} trades >100K$ — net $${whaleNet.toLocaleString()}`,
  ];
  if (tvlData) {
    reasoningParts.push(`TVL ${tvlData.name}: ${tvlAnalysis.change7d.toFixed(1)}% sur 7j (${tvlAnalysis.trend})`);
  }
  if (gas !== null) {
    reasoningParts.push(`ETH gas: ${gas} gwei (${ethActivity}) | ETH: $${ethPrice ?? 'n/a'}`);
  }
  if (futuresSentiment.reasons.length > 0) {
    reasoningParts.push(...futuresSentiment.reasons.slice(0, 3));
  }
  reasoningParts.push(`Score: ${compositeScore.toFixed(3)} | Signal: ${signal.toUpperCase()}`);

  const data: OnChainData = {
    futures: {
      openInterest: futures.openInterest?.openInterest ?? null,
      fundingRate: futures.fundingRate?.fundingRate ?? null,
      topLongShortRatio: futures.topLongShortRatio?.longShortRatio ?? null,
      globalLongShortRatio: futures.globalRatio?.longShortRatio ?? null,
      sentiment: {
        signal: futuresSentiment.signal,
        confidence: futuresSentiment.confidence,
        reasons: futuresSentiment.reasons,
      },
    },
    whales: {
      count: whales.length,
      buy_volume_usd: buyVolume,
      sell_volume_usd: sellVolume,
      net_flow_usd: whaleNet,
    },
    defi: {
      tvl_change_7d_pct: tvlAnalysis.change7d,
      tvl_trend: tvlAnalysis.trend,
      protocol_name: tvlData?.name ?? null,
    },
    ethereum: {
      eth_price_usd: ethPrice,
      gas_gwei: gas,
      activity_level: ethActivity,
    },
    signals,
  };

  return {
    agent_name: 'onchain',
    signal,
    score: compositeScore,
    confidence,
    reasoning: reasoningParts.join('\n'),
    data: data as unknown as Record<string, unknown>,
    timestamp: new Date(),
  };
}
