'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface Signal {
  id: string;
  pair: string;
  strength: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  timeframe: string;
  reason: string;
  created_at: string;
  expires_at: string;
}

interface UseSignalsReturn {
  signals: Signal[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSignals(): UseSignalsReturn {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/signals', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setError(errorData?.error ?? `Erreur ${response.status}`);
        return;
      }

      const data = await response.json();
      const signalList = Array.isArray(data) ? data : data.signals ?? [];
      setSignals(signalList as Signal[]);
    } catch {
      setError('Impossible de charger les signaux. V\u00e9rifie ta connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    fetchSignals();

    intervalRef.current = setInterval(() => {
      fetchSignals();
    }, 60_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSignals]);

  return {
    signals,
    loading,
    error,
    refresh,
  };
}
