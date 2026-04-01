import { create } from 'zustand'

export type RiskLevel = 'prudent' | 'modere' | 'agressif'
export type BotMode = 'simple' | 'expert'
export type BotStatus = 'active' | 'paused' | 'stopped'

export interface BotConfig {
  is_active: boolean
  mode: BotMode
  risk_level: RiskLevel
  strategy: string
  max_position_pct: number
  max_simultaneous: number
  max_daily_drawdown_pct: number
  max_monthly_loss: number | null
  min_confidence: number
  min_risk_reward: number
  cooldown_minutes: number
  allowed_pairs: string[]
  paper_trading: boolean
  paper_balance: number
}

export interface Bot {
  id: string
  name: string
  strategy: string
  pair: string
  status: BotStatus
  total_trades: number
  winning_trades: number
  total_pnl: number
  created_at: string
}

interface BotState {
  config: BotConfig
  bots: Bot[]
  loading: boolean
  setConfig: (config: Partial<BotConfig>) => void
  setBots: (bots: Bot[]) => void
  addBot: (bot: Bot) => void
  updateBot: (id: string, updates: Partial<Bot>) => void
  removeBot: (id: string) => void
  setLoading: (loading: boolean) => void
}

const DEFAULT_CONFIG: BotConfig = {
  is_active: false,
  mode: 'simple',
  risk_level: 'modere',
  strategy: 'momentum',
  max_position_pct: 5,
  max_simultaneous: 3,
  max_daily_drawdown_pct: 5,
  max_monthly_loss: null,
  min_confidence: 70,
  min_risk_reward: 1.5,
  cooldown_minutes: 30,
  allowed_pairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
  paper_trading: true,
  paper_balance: 50000,
}

export const useBotStore = create<BotState>((set) => ({
  config: DEFAULT_CONFIG,
  bots: [],
  loading: false,

  setConfig: (updates) =>
    set((state) => ({
      config: { ...state.config, ...updates },
    })),

  setBots: (bots) => set({ bots }),

  addBot: (bot) =>
    set((state) => ({ bots: [bot, ...state.bots] })),

  updateBot: (id, updates) =>
    set((state) => ({
      bots: state.bots.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBot: (id) =>
    set((state) => ({
      bots: state.bots.filter((b) => b.id !== id),
    })),

  setLoading: (loading) => set({ loading }),
}))
