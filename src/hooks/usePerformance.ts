'use client';

import { useState, useCallback, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface PerformanceStats {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  maxDrawdown: number;
}

interface UsePerformanceReturn extends PerformanceStats {
  loading: boolean;
  refresh: () => Promise<void>;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EMPTY_STATS: PerformanceStats = {
  totalPnl: 0,
  winRate: 0,
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  avgWin: 0,
  avgLoss: 0,
  bestTrade: 0,
  worstTrade: 0,
  profitFactor: 0,
  maxDrawdown: 0,
};

export function usePerformance(): UsePerformanceReturn {
  const [stats, setStats] = useState<PerformanceStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const computeStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStats(EMPTY_STATS);
        return;
      }

      const { data: trades, error } = await supabase
        .from('trades')
        .select('pnl')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .not('pnl', 'is', null);

      if (error || !trades || trades.length === 0) {
        setStats(EMPTY_STATS);
        return;
      }

      const pnls = trades.map((t) => Number(t.pnl));
      const totalTrades = pnls.length;
      const totalPnl = pnls.reduce((sum, p) => sum + p, 0);

      const wins = pnls.filter((p) => p > 0);
      const losses = pnls.filter((p) => p < 0);

      const winningTrades = wins.length;
      const losingTrades = losses.length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      const totalWins = wins.reduce((sum, p) => sum + p, 0);
      const totalLosses = losses.reduce((sum, p) => sum + Math.abs(p), 0);

      const avgWin = winningTrades > 0 ? totalWins / winningTrades : 0;
      const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;

      const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
      const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;

      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

      let peak = 0;
      let maxDrawdown = 0;
      let cumulative = 0;

      for (const pnl of pnls) {
        cumulative += pnl;
        if (cumulative > peak) {
          peak = cumulative;
        }
        const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      setStats({
        totalPnl,
        winRate,
        totalTrades,
        winningTrades,
        losingTrades,
        avgWin,
        avgLoss,
        bestTrade,
        worstTrade,
        profitFactor: profitFactor === Infinity ? 999 : profitFactor,
        maxDrawdown,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await computeStats();
  }, [computeStats]);

  useEffect(() => {
    computeStats();
  }, [computeStats]);

  return {
    ...stats,
    loading,
    refresh,
  };
}
