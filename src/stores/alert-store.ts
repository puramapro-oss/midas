import { create } from 'zustand'

export type AlertType = 'price' | 'volume' | 'signal' | 'drawdown'
export type AlertCondition = 'above' | 'below'

export interface Alert {
  id: string
  pair: string
  type: AlertType
  condition: AlertCondition
  value: number
  is_active: boolean
  triggered_at: string | null
  created_at: string
}

interface AlertState {
  alerts: Alert[]
  loading: boolean
  setAlerts: (alerts: Alert[]) => void
  addAlert: (alert: Alert) => void
  toggleAlert: (id: string) => void
  removeAlert: (id: string) => void
  triggerAlert: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  loading: false,

  setAlerts: (alerts) => set({ alerts }),

  addAlert: (alert) =>
    set((state) => ({ alerts: [alert, ...state.alerts] })),

  toggleAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, is_active: !a.is_active } : a
      ),
    })),

  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),

  triggerAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id
          ? { ...a, is_active: false, triggered_at: new Date().toISOString() }
          : a
      ),
    })),

  setLoading: (loading) => set({ loading }),
}))
