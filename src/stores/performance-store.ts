import { create } from 'zustand'

export interface PerformanceMetrics {
  totalPnl: number
  winRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgWin: number
  avgLoss: number
  bestTrade: number
  worstTrade: number
  profitFactor: number
  maxDrawdown: number
  sharpeRatio: number
}

export interface EquityPoint {
  date: string
  value: number
}

export interface PnlPoint {
  date: string
  pnl: number
}

interface PerformanceState {
  metrics: PerformanceMetrics
  equityCurve: EquityPoint[]
  dailyPnl: PnlPoint[]
  loading: boolean
  setMetrics: (metrics: Partial<PerformanceMetrics>) => void
  setEquityCurve: (data: EquityPoint[]) => void
  setDailyPnl: (data: PnlPoint[]) => void
  setLoading: (loading: boolean) => void
}

const DEFAULT_METRICS: PerformanceMetrics = {
  totalPnl: 0,
  winRate: 0,
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  avgWin: 0,
  avgLoss: 0,
  bestTrade: 0,
  worstTrade: 0,
  profitFactor: 0,
  maxDrawdown: 0,
  sharpeRatio: 0,
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
  metrics: DEFAULT_METRICS,
  equityCurve: [],
  dailyPnl: [],
  loading: false,

  setMetrics: (updates) =>
    set((state) => ({
      metrics: { ...state.metrics, ...updates },
    })),

  setEquityCurve: (data) => set({ equityCurve: data }),

  setDailyPnl: (data) => set({ dailyPnl: data }),

  setLoading: (loading) => set({ loading }),
}))
