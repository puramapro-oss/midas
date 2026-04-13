// =============================================================================
// MIDAS — Binance Unified Data Module
// Re-exporte les modules Binance existants (binance-public + binance-advanced)
// pour exposer une surface unique conformément au brief MIDAS-BRIEF-ULTIMATE.
// Aucune clé API requise.
// =============================================================================

export {
  pairToSymbol,
  fetchKlines,
} from '@/lib/exchange/binance-public';

export type {
  // re-exports types depuis binance-advanced si présents
} from '@/lib/exchange/binance-advanced';

// Réexports nommés des helpers Futures + order book + whales
export * as binanceAdvanced from '@/lib/exchange/binance-advanced';

const BINANCE_BASE = 'https://api.binance.com';

export interface Ticker24h {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  count: number;
}

export async function fetchTicker24h(symbol: string): Promise<Ticker24h | null> {
  try {
    const res = await fetch(`${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, string>;
    return {
      symbol: String(raw.symbol),
      priceChange: Number(raw.priceChange),
      priceChangePercent: Number(raw.priceChangePercent),
      lastPrice: Number(raw.lastPrice),
      highPrice: Number(raw.highPrice),
      lowPrice: Number(raw.lowPrice),
      volume: Number(raw.volume),
      quoteVolume: Number(raw.quoteVolume),
      count: Number(raw.count),
    };
  } catch {
    return null;
  }
}

export interface OrderBookSnapshot {
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  lastUpdateId: number;
}

export async function fetchOrderBook(symbol: string, limit = 1000): Promise<OrderBookSnapshot | null> {
  try {
    const res = await fetch(`${BINANCE_BASE}/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as { bids: [string, string][]; asks: [string, string][]; lastUpdateId: number };
    return {
      bids: raw.bids.map(([p, q]) => [Number(p), Number(q)]),
      asks: raw.asks.map(([p, q]) => [Number(p), Number(q)]),
      lastUpdateId: raw.lastUpdateId,
    };
  } catch {
    return null;
  }
}

export interface AggTrade {
  price: number;
  qty: number;
  quoteQty: number;
  time: number;
  isBuyerMaker: boolean;
}

export async function fetchAggTrades(symbol: string, limit = 500): Promise<AggTrade[]> {
  try {
    const res = await fetch(`${BINANCE_BASE}/api/v3/aggTrades?symbol=${symbol.toUpperCase()}&limit=${limit}`, {
      next: { revalidate: 10 },
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as Array<{ p: string; q: string; T: number; m: boolean }>;
    return raw.map((t) => {
      const price = Number(t.p);
      const qty = Number(t.q);
      return {
        price,
        qty,
        quoteQty: price * qty,
        time: t.T,
        isBuyerMaker: t.m,
      };
    });
  } catch {
    return [];
  }
}

/** Whales = trades > seuilUSD */
export async function fetchWhaleTrades(symbol: string, minUsd = 100_000): Promise<AggTrade[]> {
  const trades = await fetchAggTrades(symbol, 1000);
  return trades.filter((t) => t.quoteQty >= minUsd);
}
