// =============================================================================
// MIDAS — Binance Public Klines
// Fetch chandelles publiques (pas de clé requise) pour les agents technical/pattern.
// =============================================================================

import type { Candle } from '@/lib/agents/types';

const BINANCE_BASE = 'https://api.binance.com';

/**
 * Convertit une paire MIDAS (BTC/USDT) en symbole Binance (BTCUSDT).
 */
export function pairToSymbol(pair: string): string {
  return pair.replace('/', '').toUpperCase();
}

/**
 * Récupère les N dernières chandelles publiques depuis Binance.
 * Pas d'auth, rate limit raisonnable côté Binance.
 */
export async function fetchKlines(
  pair: string,
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
  limit = 200,
): Promise<Candle[]> {
  const symbol = pairToSymbol(pair);
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new Error(`Binance klines HTTP ${res.status}`);
  }
  const raw = (await res.json()) as unknown[][];
  return raw.map((k) => ({
    timestamp: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}
