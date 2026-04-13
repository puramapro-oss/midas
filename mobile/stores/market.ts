import { create } from "zustand";
import { api } from "../lib/api";
import type { MarketPrice } from "../lib/types";

interface MarketState {
  prices: MarketPrice[];
  loading: boolean;
  lastFetch: number;
  fetchPrices: () => Promise<void>;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  prices: [],
  loading: false,
  lastFetch: 0,

  fetchPrices: async () => {
    const now = Date.now();
    if (now - get().lastFetch < 30000 && get().prices.length > 0) return;
    set({ loading: true });
    try {
      const data = await api.get<{ prices: MarketPrice[] }>("/market/prices");
      set({ prices: data.prices, loading: false, lastFetch: now });
    } catch {
      set({ loading: false });
    }
  },
}));
