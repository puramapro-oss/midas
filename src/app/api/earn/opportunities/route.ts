import { NextResponse } from 'next/server';

// Public DefiLlama yields API — no key required
const YIELDS_URL = 'https://yields.llama.fi/pools';

// In-memory cache (5 min)
let cache: { ts: number; data: EarnOpportunity[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export interface EarnOpportunity {
  id: string;
  asset: string;
  symbol: string;
  protocol: string;
  chain: string;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  tvlUsd: number;
  category: 'stablecoin' | 'crypto';
  ilRisk: string;
  exposure: string;
  url: string;
}

interface LlamaPool {
  pool: string;
  symbol: string;
  project: string;
  chain: string;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  tvlUsd: number;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  url?: string;
}

const TRUSTED_PROTOCOLS = new Set([
  'binance-staked-eth',
  'binance-launchpool',
  'binance-earn',
  'aave-v3',
  'lido',
  'compound-v3',
  'morpho-blue',
  'rocket-pool',
  'pendle',
  'curve-dex',
  'convex-finance',
  'uniswap-v3',
  'maple',
  'sky-lending',
  'sky-savings-rate',
  'ethena',
]);

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json({ opportunities: cache.data, cached: true });
    }

    const res = await fetch(YIELDS_URL, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`DefiLlama HTTP ${res.status}`);
    const json = (await res.json()) as { data: LlamaPool[] };

    const opportunities: EarnOpportunity[] = json.data
      .filter(
        (p) =>
          p.apy !== null &&
          p.apy > 0 &&
          p.apy < 200 &&
          p.tvlUsd > 5_000_000 &&
          TRUSTED_PROTOCOLS.has(p.project),
      )
      .map((p) => ({
        id: p.pool,
        asset: p.symbol,
        symbol: p.symbol,
        protocol: p.project,
        chain: p.chain,
        apy: p.apy ?? 0,
        apyBase: p.apyBase,
        apyReward: p.apyReward,
        tvlUsd: p.tvlUsd,
        category: (p.stablecoin ? 'stablecoin' : 'crypto') as 'stablecoin' | 'crypto',
        ilRisk: p.ilRisk,
        exposure: p.exposure,
        url: `https://defillama.com/yields/pool/${p.pool}`,
      }))
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 60);

    cache = { ts: Date.now(), data: opportunities };
    return NextResponse.json({ opportunities, cached: false });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    // Graceful fallback : seed list de secours (taux indicatifs réalistes)
    const fallback: EarnOpportunity[] = [
      { id: 'fallback-usdc-aave', asset: 'USDC', symbol: 'USDC', protocol: 'aave-v3', chain: 'Ethereum', apy: 4.8, apyBase: 4.8, apyReward: null, tvlUsd: 1_500_000_000, category: 'stablecoin', ilRisk: 'no', exposure: 'single', url: 'https://app.aave.com' },
      { id: 'fallback-usdt-aave', asset: 'USDT', symbol: 'USDT', protocol: 'aave-v3', chain: 'Ethereum', apy: 5.2, apyBase: 5.2, apyReward: null, tvlUsd: 900_000_000, category: 'stablecoin', ilRisk: 'no', exposure: 'single', url: 'https://app.aave.com' },
      { id: 'fallback-eth-lido', asset: 'stETH', symbol: 'stETH', protocol: 'lido', chain: 'Ethereum', apy: 3.4, apyBase: 3.4, apyReward: null, tvlUsd: 25_000_000_000, category: 'crypto', ilRisk: 'no', exposure: 'single', url: 'https://stake.lido.fi' },
      { id: 'fallback-bnb-binance', asset: 'BNB', symbol: 'BNB Vault', protocol: 'binance-earn', chain: 'BSC', apy: 2.1, apyBase: 2.1, apyReward: null, tvlUsd: 800_000_000, category: 'crypto', ilRisk: 'no', exposure: 'single', url: 'https://www.binance.com/en/bnb-vault' },
    ];
    return NextResponse.json({ opportunities: fallback, fallback: true, error: msg });
  }
}
