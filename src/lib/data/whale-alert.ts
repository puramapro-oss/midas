// =============================================================================
// MIDAS — Whale Alert Data Provider
// Recupere les grosses transactions crypto via Whale Alert API
// =============================================================================

const WHALE_ALERT_BASE = 'https://api.whale-alert.io/v1';
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_MIN_VALUE_USD = 100_000;

export interface WhaleTransaction {
  id: string;
  blockchain: string;
  symbol: string;
  transaction_type: 'transfer' | 'mint' | 'burn';
  hash: string;
  from_address: string;
  from_owner: string;
  from_owner_type: 'exchange' | 'unknown' | 'whale';
  to_address: string;
  to_owner: string;
  to_owner_type: 'exchange' | 'unknown' | 'whale';
  timestamp: number;
  amount: number;
  amount_usd: number;
}

interface WhaleAlertRawTransaction {
  id: string;
  blockchain: string;
  symbol: string;
  transaction_type: string;
  hash: string;
  from: {
    address: string;
    owner: string;
    owner_type: string;
  };
  to: {
    address: string;
    owner: string;
    owner_type: string;
  };
  timestamp: number;
  amount: number;
  amount_usd: number;
}

interface WhaleAlertResponse {
  result: string;
  cursor: string;
  count: number;
  transactions: WhaleAlertRawTransaction[];
}

function getApiKey(): string {
  const key = process.env.WHALE_ALERT_API_KEY;
  if (!key) {
    throw new Error('[MIDAS:WhaleAlert] WHALE_ALERT_API_KEY manquante');
  }
  return key;
}

function normalizeOwnerType(type: string): 'exchange' | 'unknown' | 'whale' {
  if (type === 'exchange') return 'exchange';
  if (type === 'whale') return 'whale';
  return 'unknown';
}

function mapTransaction(raw: WhaleAlertRawTransaction): WhaleTransaction {
  return {
    id: raw.id,
    blockchain: raw.blockchain,
    symbol: raw.symbol,
    transaction_type: raw.transaction_type as WhaleTransaction['transaction_type'],
    hash: raw.hash,
    from_address: raw.from.address,
    from_owner: raw.from.owner,
    from_owner_type: normalizeOwnerType(raw.from.owner_type),
    to_address: raw.to.address,
    to_owner: raw.to.owner,
    to_owner_type: normalizeOwnerType(raw.to.owner_type),
    timestamp: raw.timestamp,
    amount: raw.amount,
    amount_usd: raw.amount_usd,
  };
}

async function fetchWhaleAlert<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${WHALE_ALERT_BASE}${endpoint}`);
  url.searchParams.set('api_key', getApiKey());

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown');
      throw new Error(
        `[MIDAS:WhaleAlert] HTTP ${response.status} sur ${endpoint}: ${body.slice(0, 200)}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`[MIDAS:WhaleAlert] Timeout sur ${endpoint} apres ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Recupere les transactions recentes au-dessus d'un seuil en USD.
 * Retourne un tableau vide si l'API est indisponible.
 * @param minValue - Seuil minimum en USD (defaut: 100 000)
 */
export async function getRecentTransactions(
  minValue: number = DEFAULT_MIN_VALUE_USD
): Promise<WhaleTransaction[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;

    const data = await fetchWhaleAlert<WhaleAlertResponse>('/transactions', {
      start: String(oneHourAgo),
      min_value: String(minValue),
      cursor: '',
    });

    if (data.result !== 'success' || !data.transactions) {
      return [];
    }

    return data.transactions.map(mapTransaction);
  } catch {
    return [];
  }
}

/**
 * Detecte les flux exchange significatifs (entrees/sorties) pour une crypto.
 */
export function analyzeExchangeFlows(transactions: WhaleTransaction[]): {
  inflows_usd: number;
  outflows_usd: number;
  net_flow_usd: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  transaction_count: number;
} {
  let inflowsUsd = 0;
  let outflowsUsd = 0;

  for (const tx of transactions) {
    if (tx.to_owner_type === 'exchange' && tx.from_owner_type !== 'exchange') {
      inflowsUsd += tx.amount_usd;
    }
    if (tx.from_owner_type === 'exchange' && tx.to_owner_type !== 'exchange') {
      outflowsUsd += tx.amount_usd;
    }
  }

  const netFlow = inflowsUsd - outflowsUsd;
  const threshold = Math.max(inflowsUsd, outflowsUsd) * 0.2;

  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (netFlow > threshold) {
    signal = 'bearish'; // Large inflows to exchanges = selling pressure
  } else if (netFlow < -threshold) {
    signal = 'bullish'; // Large outflows from exchanges = accumulation
  }

  return {
    inflows_usd: inflowsUsd,
    outflows_usd: outflowsUsd,
    net_flow_usd: netFlow,
    signal,
    transaction_count: transactions.length,
  };
}

export type { WhaleAlertResponse };
