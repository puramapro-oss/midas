'use client';

import { useState, useCallback, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface ExchangeConnection {
  id: string;
  user_id: string;
  exchange: string;
  status: 'connected' | 'disconnected' | 'error';
  connected_at: string | null;
  last_synced_at: string | null;
}

interface UseExchangeReturn {
  connections: ExchangeConnection[];
  connected: boolean;
  balance: number;
  loading: boolean;
  connectExchange: (exchange: string, apiKey: string, secret: string) => Promise<boolean>;
  testConnection: (exchange: string, apiKey: string, secret: string) => Promise<boolean>;
  disconnectExchange: (exchange: string) => Promise<void>;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useExchange(): UseExchangeReturn {
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConnections([]);
        return;
      }

      const { data, error } = await supabase
        .from('exchange_connections')
        .select('id, user_id, exchange, status, connected_at, last_synced_at')
        .eq('user_id', user.id);

      if (!error && data) {
        setConnections(data as ExchangeConnection[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnection = useCallback(
    async (exchange: string, apiKey: string, secret: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/exchange/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exchange, apiKey, secret }),
        });

        if (!response.ok) return false;

        const data = await response.json();
        return data.success === true;
      } catch {
        return false;
      }
    },
    []
  );

  const connectExchange = useCallback(
    async (exchange: string, apiKey: string, secret: string): Promise<boolean> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const isValid = await testConnection(exchange, apiKey, secret);
      if (!isValid) return false;

      const existing = connections.find((c) => c.exchange === exchange);
      const now = new Date().toISOString();

      if (existing) {
        const { error } = await supabase
          .from('exchange_connections')
          .update({
            status: 'connected',
            connected_at: now,
            last_synced_at: now,
          })
          .eq('id', existing.id);

        if (!error) {
          setConnections((prev) =>
            prev.map((c) =>
              c.exchange === exchange
                ? { ...c, status: 'connected', connected_at: now, last_synced_at: now }
                : c
            )
          );
          return true;
        }
      } else {
        const { data, error } = await supabase
          .from('exchange_connections')
          .insert({
            user_id: user.id,
            exchange,
            status: 'connected',
            connected_at: now,
            last_synced_at: now,
          })
          .select()
          .single();

        if (!error && data) {
          setConnections((prev) => [...prev, data as ExchangeConnection]);
          return true;
        }
      }

      return false;
    },
    [connections, testConnection]
  );

  const disconnectExchange = useCallback(
    async (exchange: string) => {
      const connection = connections.find((c) => c.exchange === exchange);
      if (!connection) return;

      const { error } = await supabase
        .from('exchange_connections')
        .update({ status: 'disconnected' })
        .eq('id', connection.id);

      if (!error) {
        setConnections((prev) =>
          prev.map((c) =>
            c.exchange === exchange
              ? { ...c, status: 'disconnected' }
              : c
          )
        );
      }
    },
    [connections]
  );

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const connected = connections.some((c) => c.status === 'connected');
  const balance = 0; // Real balance fetched via /api/exchange/balance when connected

  return {
    connections,
    connected,
    balance,
    loading,
    connectExchange,
    testConnection,
    disconnectExchange,
  };
}
