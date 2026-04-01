'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeParams<T extends Record<string, unknown> = Record<string, unknown>> {
  table: string;
  schema?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

export function useRealtime<T extends Record<string, unknown> = Record<string, unknown>>({
  table,
  schema = 'public',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeParams<T>): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Store callbacks in refs to avoid re-subscribing on every render
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);

  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channelName = `realtime-${schema}-${table}-${filter ?? 'all'}`;

    const channelConfig: {
      event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema: string;
      table: string;
      filter?: string;
    } = {
      event: '*',
      schema,
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as const,
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          switch (payload.eventType) {
            case 'INSERT':
              onInsertRef.current?.(payload);
              break;
            case 'UPDATE':
              onUpdateRef.current?.(payload);
              break;
            case 'DELETE':
              onDeleteRef.current?.(payload);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Retry connection after 5 seconds
          setTimeout(() => {
            channel.subscribe();
          }, 5000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, schema, filter, enabled]);
}
