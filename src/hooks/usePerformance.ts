'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { readPaperTrades, summarizeRecordedTrades } from '@/lib/trading/recorded-performance';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const EMPTY_STATS = summarizeRecordedTrades([]);

export function usePerformance() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentification requise');
      const asOf = Date.now();
      const trades = await readPaperTrades(supabase, user.id, asOf);
      const computed = summarizeRecordedTrades(trades, asOf);
      if (request === generation.current) setStats(computed);
    } catch (cause) {
      if (request === generation.current) {
        setStats(EMPTY_STATS);
        setError(cause instanceof Error ? cause.message : 'Performances indisponibles');
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void refresh(); });
    return () => { cancelled = true; generation.current++; };
  }, [refresh]);

  return { ...stats, loading, error, refresh };
}
