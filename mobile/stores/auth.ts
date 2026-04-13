import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";
import type { Profile } from "../lib/types";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user, session, loading: false, initialized: true });
        get().fetchProfile();
      } else {
        set({ loading: false, initialized: true });
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, session });
        if (session?.user) get().fetchProfile();
        else set({ profile: null });
      });
    } catch {
      set({ loading: false, initialized: true });
    }
  },

  fetchProfile: async () => {
    try {
      const data = await api.get<Profile>("/setup");
      set({ profile: data });
    } catch {
      // Profile fetch failed silently
    }
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ loading: false });
      throw new Error(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect"
          : error.message
      );
    }
    set({ loading: false });
  },

  signUp: async (email, password, name) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      set({ loading: false });
      throw new Error(error.message);
    }
    set({ loading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },
}));
