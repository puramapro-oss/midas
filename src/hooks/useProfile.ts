'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/hooks/useRealtime';
import type { Profile } from '@/types/database';

interface UseProfileReturn {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

export function useProfile(userId: string | null): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      setProfile(null);
    } else {
      setProfile(data as Profile);
    }

    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Real-time subscription for profile updates
  useRealtime({
    table: 'profiles',
    filter: userId ? `id=eq.${userId}` : undefined,
    onUpdate(payload) {
      setProfile(payload.new as unknown as Profile);
    },
    enabled: !!userId,
  });

  const updateProfile = useCallback(
    async (data: Partial<Profile>): Promise<{ error: string | null }> => {
      if (!userId) {
        return { error: 'Non authentifie' };
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId);

      if (updateError) {
        return { error: updateError.message };
      }

      // Optimistic update
      setProfile((prev) => (prev ? { ...prev, ...data } : null));
      return { error: null };
    },
    [userId, supabase]
  );

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
  };
}
