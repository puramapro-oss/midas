import { create } from 'zustand'

export type SignalDirection = 'BUY' | 'SELL' | 'HOLD'
export type SignalStatus = 'pending' | 'executed' | 'expired' | 'cancelled'

export interface Signal {
  id: string
  pair: string
  direction: SignalDirection
  entry_price: number
  stop_loss: number
  take_profit: number
  risk_reward: string
  confidence: number
  timeframe: string
  strategy: string
  reasoning: string
  status: SignalStatus
  agents_data: Record<string, unknown>
  created_at: string
}

interface SignalState {
  signals: Signal[]
  activeSignals: Signal[]
  loading: boolean
  setSignals: (signals: Signal[]) => void
  addSignal: (signal: Signal) => void
  updateSignalStatus: (id: string, status: SignalStatus) => void
  setLoading: (loading: boolean) => void
}

export const useSignalStore = create<SignalState>((set) => ({
  signals: [],
  activeSignals: [],
  loading: false,

  setSignals: (signals) =>
    set({
      signals,
      activeSignals: signals.filter((s) => s.status === 'pending' || s.status === 'executed'),
    }),

  addSignal: (signal) =>
    set((state) => {
      const signals = [signal, ...state.signals]
      return {
        signals,
        activeSignals: signals.filter((s) => s.status === 'pending' || s.status === 'executed'),
      }
    }),

  updateSignalStatus: (id, status) =>
    set((state) => {
      const signals = state.signals.map((s) => (s.id === id ? { ...s, status } : s))
      return {
        signals,
        activeSignals: signals.filter((s) => s.status === 'pending' || s.status === 'executed'),
      }
    }),

  setLoading: (loading) => set({ loading }),
}))
