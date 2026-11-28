'use client';

type Session = { user: { id: string } } | null;
type Callback = (event: string, session: Session) => void;
declare global {
  interface Window {
    __midasTestInitialAccount?: string | null;
    __midasTestAccount?: (account: string | null) => void;
  }
}

const subscribers = new Set<Callback>();
let initialized = false;
let account: string | null = null;

// The production hook is unchanged. This test boundary implements only its
// Supabase onAuthStateChange contract; it has no tokens or network transport.
export function createClient() {
  if (!initialized) {
    initialized = true;
    account = window.__midasTestInitialAccount ?? null;
    window.__midasTestAccount = (next) => {
      account = next;
      for (const subscriber of subscribers) {
        subscriber(next ? 'SIGNED_IN' : 'SIGNED_OUT', next ? { user: { id: next } } : null);
      }
    };
  }
  return {
    auth: {
      onAuthStateChange(callback: Callback) {
        subscribers.add(callback);
        queueMicrotask(() => {
          if (subscribers.has(callback)) callback('INITIAL_SESSION', account ? { user: { id: account } } : null);
        });
        return { data: { subscription: { unsubscribe() { subscribers.delete(callback); } } } };
      },
    },
  };
}
