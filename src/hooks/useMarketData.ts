'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface PriceData {
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatedAt: string;
}

interface UseMarketDataReturn {
  prices: Record<string, PriceData>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMarketData(): UseMarketDataReturn {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/market/prices', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setError(errorData?.error ?? `Erreur ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data && typeof data === 'object') {
        const normalized: Record<string, PriceData> = {};

        for (const [symbol, value] of Object.entries(data)) {
          const v = value as Record<string, unknown>;
          normalized[symbol] = {
            price: Number(v.price ?? 0),
            change24h: Number(v.change24h ?? 0),
            changePercent24h: Number(v.changePercent24h ?? 0),
            high24h: Number(v.high24h ?? 0),
            low24h: Number(v.low24h ?? 0),
            volume24h: Number(v.volume24h ?? 0),
            updatedAt: String(v.updatedAt ?? new Date().toISOString()),
          };
        }

        setPrices(normalized);
      }
    } catch {
      setError('Impossible de charger les prix. V\u00e9rifie ta connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    fetchPrices();

    intervalRef.current = setInterval(() => {
      fetchPrices();
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices]);

  return {
    prices,
    loading,
    error,
    refresh,
  };
}
