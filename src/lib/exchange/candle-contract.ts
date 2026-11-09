export const CANDLE_INTERVAL_MS = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 } as const;
export type CandleInterval = keyof typeof CANDLE_INTERVAL_MS;

/** End is exclusive; only whole, completed candles belong to a backtest. */
export function historicalWindow(start: number, end: number, interval: CandleInterval, now = Date.now()) {
  const step = CANDLE_INTERVAL_MS[interval];
  if (!step || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start <= 0 || end <= start || end > now) {
    throw new Error('Invalid historical date range');
  }
  const first = Math.ceil(start / step) * step;
  const endExclusive = Math.floor(end / step) * step;
  const count = (endExclusive - first) / step;
  if (count < 1 || count > 5000) throw new Error('Historical range requires between 1 and 5000 completed candles');
  return { first, endExclusive, count, step };
}
