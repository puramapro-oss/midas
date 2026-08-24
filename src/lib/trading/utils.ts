export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchRealCandles(pair: string, timeframe: string): Promise<CandleData[]> {
  const res = await fetch(
    `/api/market/candles?pair=${encodeURIComponent(pair)}&timeframe=${timeframe}&limit=200`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    candles: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }>;
  };
  return data.candles.map((c) => ({
    time: Math.floor(c.timestamp / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

export function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return price.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}
