import { create } from 'zustand';

export interface Trade {
  id: string;
  userId: string;
  pair: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  price: number;
  quantity: number;
  total: number;
  exchange: string;
  status: 'open' | 'closed' | 'cancelled' | 'pending';
  pnl: number | null;
  pnlPercent: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  createdAt: string;
  closedAt: string | null;
}

interface TradeState {
  openPositions: Trade[];
  recentTrades: Trade[];
  addPosition: (trade: Trade) => void;
  removePosition: (tradeId: string) => void;
  updatePosition: (tradeId: string, updates: Partial<Trade>) => void;
  setOpenPositions: (positions: Trade[]) => void;
  setRecentTrades: (trades: Trade[]) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  openPositions: [],
  recentTrades: [],

  addPosition: (trade) =>
    set((state) => ({
      openPositions: [trade, ...state.openPositions],
    })),

  removePosition: (tradeId) =>
    set((state) => ({
      openPositions: state.openPositions.filter((t) => t.id !== tradeId),
    })),

  updatePosition: (tradeId, updates) =>
    set((state) => ({
      openPositions: state.openPositions.map((t) =>
        t.id === tradeId ? { ...t, ...updates } : t,
      ),
    })),

  setOpenPositions: (positions) =>
    set({ openPositions: positions }),

  setRecentTrades: (trades) =>
    set({ recentTrades: trades }),
}));
