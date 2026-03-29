'use client';

import { useState, useCallback, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Bot {
  id: string;
  user_id: string;
  name: string;
  pair: string;
  strategy: string;
  status: 'active' | 'paused' | 'error';
  exchange: string;
  config: Record<string, unknown>;
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  max_drawdown: number;
  created_at: string;
  updated_at: string;
}

interface CreateBotParams {
  name: string;
  pair: string;
  strategy: string;
  exchange: string;
  config?: Record<string, unknown>;
}

interface UseBotsReturn {
  bots: Bot[];
  loading: boolean;
  fetchBots: () => Promise<void>;
  createBot: (params: CreateBotParams) => Promise<Bot | null>;
  toggleBot: (botId: string) => Promise<void>;
  deleteBot: (botId: string) => Promise<void>;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useBots(): UseBotsReturn {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBots = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBots([]);
        return;
      }

      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBots(data as Bot[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createBot = useCallback(
    async (params: CreateBotParams): Promise<Bot | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('bots')
        .insert({
          user_id: user.id,
          name: params.name,
          pair: params.pair,
          strategy: params.strategy,
          exchange: params.exchange,
          config: params.config ?? {},
          status: 'paused',
          total_pnl: 0,
          win_rate: 0,
          total_trades: 0,
          max_drawdown: 0,
        })
        .select()
        .single();

      if (!error && data) {
        const newBot = data as Bot;
        setBots((prev) => [newBot, ...prev]);
        return newBot;
      }

      return null;
    },
    []
  );

  const toggleBot = useCallback(
    async (botId: string) => {
      const bot = bots.find((b) => b.id === botId);
      if (!bot) return;

      const newStatus = bot.status === 'active' ? 'paused' : 'active';

      const { error } = await supabase
        .from('bots')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', botId);

      if (!error) {
        setBots((prev) =>
          prev.map((b) =>
            b.id === botId ? { ...b, status: newStatus } : b
          )
        );
      }
    },
    [bots]
  );

  const deleteBot = useCallback(async (botId: string) => {
    const { error } = await supabase
      .from('bots')
      .delete()
      .eq('id', botId);

    if (!error) {
      setBots((prev) => prev.filter((b) => b.id !== botId));
    }
  }, []);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  return {
    bots,
    loading,
    fetchBots,
    createBot,
    toggleBot,
    deleteBot,
  };
}
