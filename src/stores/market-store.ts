import { create } from 'zustand';

export interface MarketPrice {
  price: number;
  change24h: number;
  volume24h: number;
}

interface MarketState {
  prices: Record<string, MarketPrice>;
  selectedPair: string;
  setPrice: (pair: string, data: MarketPrice) => void;
  setPrices: (prices: Record<string, MarketPrice>) => void;
  setSelectedPair: (pair: string) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  prices: {},
  selectedPair: 'BTC/USDT',

  setPrice: (pair, data) =>
    set((state) => ({
      prices: { ...state.prices, [pair]: data },
    })),

  setPrices: (prices) =>
    set((state) => ({
      prices: { ...state.prices, ...prices },
    })),

  setSelectedPair: (pair) =>
    set({ selectedPair: pair }),
}));
