'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SUPER_ADMIN_EMAIL } from '@/types/database';
import type { Profile } from '@/types/database';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  plan: Profile['plan'] | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    },
    [supabase]
  );

  const refetch = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (currentSession?.user) {
      setSession(currentSession);
      setUser(currentSession.user);
      await fetchProfile(currentSession.user.id);
    }
  }, [supabase, fetchProfile]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if user explicitly logged out
        const forcedLogout = localStorage.getItem('midas_forced_logout');
        if (forcedLogout === 'true') {
          // User explicitly signed out — do not restore session
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch { /* ignore */ }
          setLoading(false);
          return;
        }

        // Check if session should be temporary (browser was closed without "remember me")
        const rememberMe = localStorage.getItem('midas_remember');
        const sessionValid = sessionStorage.getItem('midas_session_valid');
        if (rememberMe === 'false' && !sessionValid) {
          // Browser was closed and user didn't check "remember me" — clear session
          try {
            const keys = Object.keys(localStorage);
            for (const key of keys) {
              if (key.startsWith('sb-') || key.startsWith('supabase')) {
                localStorage.removeItem(key);
              }
            }
            localStorage.removeItem('midas_remember');
            await supabase.auth.signOut({ scope: 'local' });
          } catch { /* ignore */ }
          setLoading(false);
          return;
        }

        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Re-mark session as valid for this browser session
          sessionStorage.setItem('midas_session_valid', 'true');
          await fetchProfile(currentSession.user.id);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }
      return { error: null };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string
    ): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        return { error: error.message };
      }
      return { error: null };
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }, [supabase]);

  const signOut = useCallback(async () => {
    // Clear state immediately — don't wait for the network call
    setUser(null);
    setProfile(null);
    setSession(null);

    // Set forced logout flag BEFORE clearing storage
    try {
      localStorage.setItem('midas_forced_logout', 'true');
    } catch { /* ignore */ }

    // Clear all auth data from storage
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('sb-') || key.startsWith('supabase')) {
          localStorage.removeItem(key);
        }
      }
      localStorage.removeItem('midas_remember');
      sessionStorage.removeItem('midas_session_valid');
    } catch {
      // storage unavailable
    }

    // Clear all cookies
    try {
      document.cookie.split(';').forEach((c) => {
        const name = c.trim().split('=')[0];
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    } catch { /* ignore */ }

    // Then call Supabase signOut — wrapped in try/catch so it never blocks navigation
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // signOut can fail if session is already expired — that's fine
    }
  }, [supabase]);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  const isAdmin =
    isSuperAdmin || profile?.role === 'admin' || profile?.role === 'super_admin';

  return {
    user,
    profile,
    session,
    loading,
    isAuthenticated: !!user,
    isSuperAdmin,
    isAdmin,
    plan: profile?.plan ?? null,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refetch,
  };
}
