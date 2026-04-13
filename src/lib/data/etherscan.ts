// =============================================================================
// MIDAS — Etherscan Provider
// 100K calls/jour. Suivi whales, gas, prix ETH.
// =============================================================================

import { cacheGetOrSet } from '@/lib/cache/upstash';

const ETHERSCAN_BASE = 'https://api.etherscan.io/api';
const TIMEOUT_MS = 15000;

function getKey(): string | null {
  return process.env.ETHERSCAN_API_KEY?.trim() || null;
}

async function esFetch<T>(params: Record<string, string>): Promise<T | null> {
  const key = getKey();
  if (!key) return null;
  const qs = new URLSearchParams({ ...params, apikey: key }).toString();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ETHERSCAN_BASE}?${qs}`, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as { status: string; result?: T };
    if (json.status !== '1' && !json.result) return null;
    return (json.result ?? null) as T | null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface EthTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  input: string;
}

export async function fetchWhaleTxs(address: string, startBlock = 0): Promise<EthTransaction[]> {
  return cacheGetOrSet(
    `etherscan:txs:${address}:${startBlock}`,
    async () =>
      (await esFetch<EthTransaction[]>({
        module: 'account',
        action: 'txlist',
        address,
        startblock: String(startBlock),
        endblock: '99999999',
        page: '1',
        offset: '50',
        sort: 'desc',
      })) ?? [],
    60,
  );
}

export interface EthPrice {
  ethbtc: string;
  ethbtc_timestamp: string;
  ethusd: string;
  ethusd_timestamp: string;
}

export async function fetchEthPrice(): Promise<EthPrice | null> {
  return cacheGetOrSet(
    'etherscan:ethprice',
    async () => esFetch<EthPrice>({ module: 'stats', action: 'ethprice' }),
    60,
  );
}

export interface GasOracle {
  LastBlock: string;
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
  suggestBaseFee: string;
  gasUsedRatio: string;
}

export async function fetchGasOracle(): Promise<GasOracle | null> {
  return cacheGetOrSet(
    'etherscan:gas',
    async () => esFetch<GasOracle>({ module: 'gastracker', action: 'gasoracle' }),
    30,
  );
}
