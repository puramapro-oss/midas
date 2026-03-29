import { create } from 'zustand';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

interface UIState {
  sidebarOpen: boolean;
  chatModalOpen: boolean;
  selectedTimeframe: Timeframe;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleChatModal: () => void;
  setChatModalOpen: (open: boolean) => void;
  setTimeframe: (timeframe: Timeframe) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  chatModalOpen: false,
  selectedTimeframe: '1h',

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  toggleChatModal: () =>
    set((state) => ({ chatModalOpen: !state.chatModalOpen })),

  setChatModalOpen: (open) =>
    set({ chatModalOpen: open }),

  setTimeframe: (timeframe) =>
    set({ selectedTimeframe: timeframe }),
}));
