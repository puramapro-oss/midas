// Public market candles with an exact pair/interval contract. Indicative USD
// observations are exposed separately and never substituted for exchange bars.
import type { Candle } from '@/lib/agents/types';
import { createSingleFlight } from '../cache/single-flight.ts';
import { CANDLE_INTERVAL_MS as INTERVAL_MS, historicalWindow, type CandleInterval as Interval } from './candle-contract.ts';

const BINANCE_BASE = 'https://api.binance.com';
const REQUEST_TIMEOUT_MS = 4000;
const coalesce = createSingleFlight();
export const MIN_CANDLES = 200;

export interface KlineFetchResult {
  candles: Candle[];
  source: 'binance' | 'vps_proxy' | 'none';
  pair: string;
  interval: Interval;
  timestamp_basis: 'open';
  volume_available: boolean;
  fetched_at: number;
  unavailable_reason?: string;
}

export function pairToSymbol(pair: string): string {
  const value = pair.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,15}(?:\/[A-Z0-9]{1,15})?$/.test(value)) throw new Error('Invalid market pair');
  return value.replace('/', '');
}

function numeric(value: unknown): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return NaN;
  return Number(value);
}
function validCandle(c: Candle): boolean {
  return Number.isSafeInteger(c.timestamp) && c.timestamp > 0 && c.timestamp <= Date.now() + 5000 &&
    [c.open, c.high, c.low, c.close].every(n => Number.isFinite(n) && n > 0) &&
    Number.isFinite(c.volume) && c.volume >= 0 && c.high >= Math.max(c.open, c.close, c.low) &&
    c.low <= Math.min(c.open, c.close, c.high);
}
function parseBinanceKlines(raw: unknown, interval: Interval, limit: number): Candle[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > limit) return null;
  const candles: Candle[] = [];
  const step = INTERVAL_MS[interval];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 7) return null;
    const candle = { timestamp: numeric(row[0]), open: numeric(row[1]), high: numeric(row[2]),
      low: numeric(row[3]), close: numeric(row[4]), volume: numeric(row[5]) };
    if (!validCandle(candle) || candle.timestamp % step !== 0 || numeric(row[6]) !== candle.timestamp + step - 1 ||
        (candles.length > 0 && candle.timestamp - candles[candles.length - 1].timestamp !== step)) return null;
    candles.push(candle);
  }
  return candles;
}

async function requestJSON(url: string, headers?: Record<string, string>): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal, redirect: 'error', next: { revalidate: 30 } });
    return { status: response.status, body: response.ok ? await response.json() : null };
  } catch {
    return { status: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchKlines(pair: string, interval: Interval = '1h', limit = 200): Promise<Candle[]> {
  return (await fetchKlinesWithSource(pair, interval, limit)).candles;
}

export async function fetchKlinesWithSource(pair: string, interval: Interval = '1h', limit = 200,
  window?: { startTime: number; endTime: number }): Promise<KlineFetchResult> {
  const symbol = pairToSymbol(pair);
  if (!Object.hasOwn(INTERVAL_MS, interval) || !Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid candle interval or limit');
  if (window && (!Number.isSafeInteger(window.startTime) || !Number.isSafeInteger(window.endTime) ||
      window.startTime <= 0 || window.endTime < window.startTime)) throw new Error('Invalid candle window');
  const normalized = pair.trim().toUpperCase();
  return coalesce(`${normalized}:${interval}:${limit}:${window?.startTime ?? ''}:${window?.endTime ?? ''}`, async () => {
    const base = { pair: normalized, interval, timestamp_basis: 'open' as const };
    const empty = (reason: string): KlineFetchResult => ({ ...base, candles: [], source: 'none', volume_available: false, fetched_at: Date.now(), unavailable_reason: reason });
    const query = new URLSearchParams({ symbol, interval, limit: String(limit) });
    if (window) { query.set('startTime', String(window.startTime)); query.set('endTime', String(window.endTime)); }
    const direct = await requestJSON(`${BINANCE_BASE}/api/v3/klines?${query}`);
    if (direct.status === 200) {
      const candles = parseBinanceKlines(direct.body, interval, limit);
      if (candles) return { ...base, candles, source: 'binance', volume_available: true, fetched_at: Date.now() };
    }
    // A denied or throttled provider must not be retried through another origin.
    if (direct.status >= 400 && direct.status < 500) return empty(`provider_http_${direct.status}`);

    const relay = process.env.MIDAS_BINANCE_PROXY_URL;
    const token = process.env.MIDAS_BINANCE_PROXY_TOKEN;
    if (relay && token) {
      let url: URL;
      try {
        url = new URL(relay);
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return empty('invalid_relay_configuration');
        url.pathname = url.pathname.replace(/\/$/, '') + '/klines';
        url.search = query.toString();
      } catch { return empty('invalid_relay_configuration'); }
      const response = await requestJSON(url.toString(), { 'X-Midas-Token': token });
      if (response.status === 200) {
        const candles = parseBinanceKlines(response.body, interval, limit);
        if (candles) return { ...base, candles, source: 'vps_proxy', volume_available: true, fetched_at: Date.now() };
      }
    }
    return empty('matching_candles_unavailable');
  });
}

/** Fetch the entire requested interval. Partial history is never relabeled as a
 * complete backtest; provider restrictions retain the same fail-closed policy. */
export async function fetchHistoricalKlines(pair: string, interval: Interval, start: number, end: number) {
  const window = historicalWindow(start, end, interval);
  const candles: Candle[] = [];
  const sources = new Set<string>();
  for (let cursor = window.first; cursor < window.endExclusive;) {
    const limit = Math.min(1000, (window.endExclusive - cursor) / window.step);
    const page = await fetchKlinesWithSource(pair, interval, limit, {
      startTime: cursor, endTime: cursor + limit * window.step - 1,
    });
    if (page.candles.length !== limit || page.candles[0]?.timestamp !== cursor) {
      return { ...window, candles: [] as Candle[], sources: [] as string[], complete: false,
        unavailable_reason: page.unavailable_reason ?? 'historical_range_incomplete' };
    }
    candles.push(...page.candles); sources.add(page.source);
    cursor += limit * window.step;
  }
  return { ...window, candles, sources: [...sources], complete: true, unavailable_reason: undefined };
}

export interface PaperQuote { price: number; observed_at: number; source: 'binance_aggTrades' }
/** Last observed transaction, with its exchange timestamp. It is an educational
 * mark, not an executable bid/ask or an exchange fill. */
export async function fetchPaperQuote(pair: string): Promise<PaperQuote | null> {
  const symbol = pairToSymbol(pair);
  return coalesce(`paper-quote:${symbol}`, async () => {
    const result = await requestJSON(`${BINANCE_BASE}/api/v3/aggTrades?${new URLSearchParams({ symbol, limit: '1' })}`);
    if (result.status !== 200 || !Array.isArray(result.body) || result.body.length !== 1) return null;
    const raw = result.body[0];
    if (!raw || typeof raw !== 'object') return null;
    const price = numeric(raw.p); const observed_at = numeric(raw.T);
    if (!Number.isFinite(price) || price <= 0 || price >= 1e12 || !Number.isSafeInteger(observed_at) ||
        observed_at < Date.now() - 120000 || observed_at > Date.now() + 5000) return null;
    return { price, observed_at, source: 'binance_aggTrades' };
  });
}

const COINGECKO_IDS: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOGE: 'dogecoin', DOT: 'polkadot', LINK: 'chainlink',
  MATIC: 'matic-network', UNI: 'uniswap' };

export interface IndicativeOhlc {
  source: 'coingecko';
  requested_pair: string;
  pair: string;
  interval: '30m' | '4h' | '4d';
  timestamp_basis: 'open';
  volume_available: false;
  candles: Array<Omit<Candle, 'volume'> & { volume: null }>;
  fetched_at: number;
}

/** Explicit indicative observations. CoinGecko returns USD, automatic intervals,
 * close timestamps and no volume. This type cannot feed volume-based agents.
 * Docs: https://docs.coingecko.com/demo/reference/coins-id-ohlc */
export async function fetchCoinGeckoOhlc(pair: string, requestedInterval: Interval): Promise<IndicativeOhlc | null> {
  pairToSymbol(pair);
  if (!Object.hasOwn(INTERVAL_MS, requestedInterval)) throw new Error('Invalid candle interval');
  const base = pair.trim().toUpperCase().split('/')[0];
  const id = COINGECKO_IDS[base];
  if (!id) return null;
  const days = requestedInterval === '1d' ? 90 : requestedInterval === '4h' ? 30 : requestedInterval === '1h' ? 7 : 1;
  const actual = days <= 2 ? { name: '30m' as const, ms: 1800000 } : days <= 30 ? { name: '4h' as const, ms: 14400000 } : { name: '4d' as const, ms: 345600000 };
  const result = await requestJSON(`https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`);
  if (result.status !== 200 || !Array.isArray(result.body) || !result.body.length || result.body.length > 1000) return null;
  const candles: IndicativeOhlc['candles'] = [];
  for (const row of result.body) {
    if (!Array.isArray(row) || row.length !== 5) return null;
    const candle = { timestamp: numeric(row[0]) - actual.ms, open: numeric(row[1]), high: numeric(row[2]),
      low: numeric(row[3]), close: numeric(row[4]), volume: 0 };
    if (!validCandle(candle) || numeric(row[0]) > Date.now() + 5000 ||
        (candles.length > 0 && candle.timestamp - candles[candles.length - 1].timestamp !== actual.ms)) return null;
    candles.push({ ...candle, volume: null });
  }
  return { source: 'coingecko', requested_pair: pair.trim().toUpperCase(), pair: `${base}/USD`, interval: actual.name,
    timestamp_basis: 'open', volume_available: false, candles, fetched_at: Date.now() };
}
