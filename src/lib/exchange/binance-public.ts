// =============================================================================
// MIDAS — Binance Public Klines
// Fetch chandelles publiques (pas de clé requise) pour les agents technical/pattern.
// =============================================================================

import type { Candle } from '@/lib/agents/types';

const BINANCE_BASE = 'https://api.binance.com';
// VPS proxy (Hostinger 72.62.191.111:9999) — relai des routes publiques Binance
// pour contourner le géo-block US-East de Vercel.
const VPS_PROXY_BASE = process.env.MIDAS_BINANCE_PROXY_URL ?? 'http://72.62.191.111:9999';
const VPS_PROXY_TOKEN = process.env.MIDAS_BINANCE_PROXY_TOKEN ?? 'midas-vps-2026-bunny-jumps-over-walls';

/**
 * Convertit une paire MIDAS (BTC/USDT) en symbole Binance (BTCUSDT).
 */
export function pairToSymbol(pair: string): string {
  return pair.replace('/', '').toUpperCase();
}

interface KlineFetchResult {
  candles: Candle[];
  source: 'binance' | 'vps_proxy' | 'coingecko' | 'none';
}

function parseBinanceKlines(raw: unknown[][]): Candle[] {
  return raw.map((k) => ({
    timestamp: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

/**
 * Récupère les N dernières chandelles publiques depuis Binance.
 * Cascade: Binance direct → VPS proxy → CoinGecko OHLC (sans volume).
 */
export async function fetchKlines(
  pair: string,
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
  limit = 200,
): Promise<Candle[]> {
  const result = await fetchKlinesWithSource(pair, interval, limit);
  return result.candles;
}

/**
 * Variante qui retourne aussi la source utilisée (pour heartbeat market_data).
 */
export async function fetchKlinesWithSource(
  pair: string,
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
  limit = 200,
): Promise<KlineFetchResult> {
  const symbol = pairToSymbol(pair);

  // 1) Binance direct (échoue depuis Vercel US-East = 451)
  try {
    const res = await fetch(
      `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { next: { revalidate: 30 } },
    );
    if (res.ok) {
      const raw = (await res.json()) as unknown[][];
      return { candles: parseBinanceKlines(raw), source: 'binance' };
    }
  } catch {
    // fallthrough
  }

  // 2) VPS proxy (Hostinger relay)
  try {
    const res = await fetch(
      `${VPS_PROXY_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      {
        headers: { 'X-Midas-Token': VPS_PROXY_TOKEN },
        next: { revalidate: 30 },
      },
    );
    if (res.ok) {
      const raw = (await res.json()) as unknown[][];
      return { candles: parseBinanceKlines(raw), source: 'vps_proxy' };
    }
  } catch {
    // fallthrough
  }

  // 3) CoinGecko OHLC (sans volume, derniers recours)
  const candles = await fetchCoinGeckoOhlc(pair, interval);
  return {
    candles,
    source: candles.length > 0 ? 'coingecko' : 'none',
  };
}

const COINGECKO_PAIR_MAP: Record<string, string> = {
  'BTC/USDT': 'bitcoin',
  'ETH/USDT': 'ethereum',
  'SOL/USDT': 'solana',
  'BNB/USDT': 'binancecoin',
  'XRP/USDT': 'ripple',
  'ADA/USDT': 'cardano',
  'AVAX/USDT': 'avalanche-2',
  'DOGE/USDT': 'dogecoin',
  'DOT/USDT': 'polkadot',
  'LINK/USDT': 'chainlink',
  'MATIC/USDT': 'matic-network',
  'UNI/USDT': 'uniswap',
};

async function fetchCoinGeckoOhlc(
  pair: string,
  interval: string,
): Promise<Candle[]> {
  const id = COINGECKO_PAIR_MAP[pair.toUpperCase()];
  if (!id) return [];
  // Days param mapping (CG uses days, not interval; granularity auto)
  const days = interval === '1d' ? 90 : interval === '4h' ? 30 : interval === '1h' ? 7 : 1;
  const url = `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const raw = (await res.json()) as number[][];
  return raw.map((row) => ({
    timestamp: row[0],
    open: row[1],
    high: row[2],
    low: row[3],
    close: row[4],
    volume: 0, // CG OHLC ne fournit pas le volume
  }));
}
