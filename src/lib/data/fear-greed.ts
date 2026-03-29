// =============================================================================
// MIDAS — Fear & Greed Index Provider
// Recupere l'indice Fear & Greed depuis alternative.me API
// =============================================================================

const FEAR_GREED_BASE = 'https://api.alternative.me/fng';
const REQUEST_TIMEOUT_MS = 10000;

export interface FearGreedEntry {
  value: number;
  value_classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  timestamp: string;
  time_until_update: string | null;
}

interface FearGreedResponse {
  name: string;
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
    time_until_update?: string;
  }>;
  metadata: {
    error: string | null;
  };
}

async function fetchFearGreed(params?: Record<string, string>): Promise<FearGreedResponse> {
  const url = new URL(FEAR_GREED_BASE);
  url.searchParams.set('format', 'json');

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
        `[MIDAS:FearGreed] HTTP ${response.status}: ${body.slice(0, 200)}`
      );
    }

    const data = (await response.json()) as FearGreedResponse;

    if (data.metadata?.error) {
      throw new Error(`[MIDAS:FearGreed] API error: ${data.metadata.error}`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`[MIDAS:FearGreed] Timeout apres ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseEntry(raw: {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}): FearGreedEntry {
  return {
    value: parseInt(raw.value, 10),
    value_classification: raw.value_classification as FearGreedEntry['value_classification'],
    timestamp: raw.timestamp,
    time_until_update: raw.time_until_update ?? null,
  };
}

/**
 * Recupere l'indice Fear & Greed actuel.
 */
export async function getCurrentIndex(): Promise<FearGreedEntry> {
  const response = await fetchFearGreed({ limit: '1' });

  if (!response.data || response.data.length === 0) {
    throw new Error('[MIDAS:FearGreed] Aucune donnee retournee');
  }

  return parseEntry(response.data[0]);
}

/**
 * Recupere l'historique de l'indice Fear & Greed.
 * @param days - Nombre de jours d'historique (defaut: 30, max: 0 pour tout)
 */
export async function getHistorical(days = 30): Promise<FearGreedEntry[]> {
  const response = await fetchFearGreed({
    limit: String(days),
  });

  if (!response.data || response.data.length === 0) {
    return [];
  }

  return response.data.map(parseEntry);
}

/**
 * Convertit l'indice Fear & Greed en signal de trading.
 * Extreme Fear (<20) = potentiel achat (contrarian), Extreme Greed (>80) = potentiel vente.
 */
export function fearGreedToSignal(value: number): {
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  interpretation: string;
} {
  if (value <= 15) {
    return {
      signal: 'bullish',
      strength: 0.9,
      interpretation: 'Extreme Fear - signal contrarian fortement haussier',
    };
  }
  if (value <= 25) {
    return {
      signal: 'bullish',
      strength: 0.7,
      interpretation: 'Fear - signal contrarian haussier',
    };
  }
  if (value <= 40) {
    return {
      signal: 'bullish',
      strength: 0.3,
      interpretation: 'Fear moderee - legerement haussier',
    };
  }
  if (value <= 60) {
    return {
      signal: 'neutral',
      strength: 0.1,
      interpretation: 'Marche neutre - pas de signal clair',
    };
  }
  if (value <= 75) {
    return {
      signal: 'bearish',
      strength: 0.3,
      interpretation: 'Greed moderee - legerement baissier',
    };
  }
  if (value <= 85) {
    return {
      signal: 'bearish',
      strength: 0.7,
      interpretation: 'Greed - signal contrarian baissier',
    };
  }
  return {
    signal: 'bearish',
    strength: 0.9,
    interpretation: 'Extreme Greed - signal contrarian fortement baissier',
  };
}
