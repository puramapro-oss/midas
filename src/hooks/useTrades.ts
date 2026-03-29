'use client';

import { useState, useCallback, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Trade {
  id: string;
  user_id: string;
  bot_id: string | null;
  pair: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl: number | null;
  status: 'open' | 'closed' | 'cancelled';
  stop_loss: number | null;
  take_profit: number | null;
  exchange: string;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
}

interface UseTradesReturn {
  openPositions: Trade[];
  recentTrades: Trade[];
  loading: boolean;
  fetchTrades: () => Promise<void>;
  closeTrade: (tradeId: string, exitPrice: number) => Promise<void>;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useTrades(): UseTradesReturn {
  const [openPositions, setOpenPositions] = useState<Trade[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOpenPositions([]);
        setRecentTrades([]);
        return;
      }

      const [openResult, closedResult] = await Promise.all([
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'open')
          .order('opened_at', { ascending: false }),
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'closed')
          .order('closed_at', { ascending: false })
          .limit(50),
      ]);

      if (!openResult.error && openResult.data) {
        setOpenPositions(openResult.data as Trade[]);
      }

      if (!closedResult.error && closedResult.data) {
        setRecentTrades(closedResult.data as Trade[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const closeTrade = useCallback(
    async (tradeId: string, exitPrice: number) => {
      const trade = openPositions.find((t) => t.id === tradeId);
      if (!trade) return;

      const pnl =
        trade.side === 'buy'
          ? (exitPrice - trade.entry_price) * trade.quantity
          : (trade.entry_price - exitPrice) * trade.quantity;

      const now = new Date().toISOString();

      const { error } = await supabase
        .from('trades')
        .update({
          status: 'closed',
          exit_price: exitPrice,
          pnl,
          closed_at: now,
        })
        .eq('id', tradeId);

      if (!error) {
        const closedTrade: Trade = {
          ...trade,
          status: 'closed',
          exit_price: exitPrice,
          pnl,
          closed_at: now,
        };

        setOpenPositions((prev) => prev.filter((t) => t.id !== tradeId));
        setRecentTrades((prev) => [closedTrade, ...prev]);
      }
    },
    [openPositions]
  );

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return {
    openPositions,
    recentTrades,
    loading,
    fetchTrades,
    closeTrade,
  };
}
