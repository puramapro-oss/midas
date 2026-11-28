'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NotificationSession { accountId: string; generation: number; }

/** A new generation also isolates a rapid A → B → A account change. */
export function useNotificationSession() {
  const [session, setSession] = useState<NotificationSession | null>();
  const identity = useRef<string | null | undefined>(undefined);
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      const accountId = next?.user.id ?? null;
      if (identity.current === accountId) return;
      identity.current = accountId;
      generation.current += 1;
      setSession(accountId ? { accountId, generation: generation.current } : null);
    });
    return () => {
      active = false;
      identity.current = undefined;
      subscription.unsubscribe();
    };
  }, []);
  return session;
}
