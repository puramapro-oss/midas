import { TrendingUp, Volume2, Brain, Shield } from 'lucide-react'

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

export const typeConfig: Record<
  AlertType,
  { label: string; icon: typeof TrendingUp; color: string }
> = {
  price: { label: 'Prix', icon: TrendingUp, color: 'text-[#FFD700]' },
  volume: { label: 'Volume', icon: Volume2, color: 'text-blue-400' },
  signal: { label: 'Signal IA', icon: Brain, color: 'text-purple-400' },
  drawdown: { label: 'Drawdown', icon: Shield, color: 'text-red-400' },
}

export const SAMPLE_ALERTS: Alert[] = []

export function formatValue(type: AlertType, value: number): string {
  if (type === 'price') return `$${value.toLocaleString('fr-FR')}`
  if (type === 'volume') return `$${(value / 1e6).toFixed(0)}M`
  if (type === 'signal') return `${value}% confiance`
  if (type === 'drawdown') return `${value}%`
  return value.toString()
}

export const PAIR_OPTIONS = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'BNB/USDT',
  'DOGE/USDT',
  'XRP/USDT',
  'ADA/USDT',
  'AVAX/USDT',
]
