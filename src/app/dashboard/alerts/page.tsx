'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Volume2,
  Shield,
  Brain,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

type AlertType = 'price' | 'volume' | 'signal' | 'drawdown'
type AlertCondition = 'above' | 'below'

interface Alert {
  id: string
  pair: string
  type: AlertType
  condition: AlertCondition
  value: number
  is_active: boolean
  triggered_at: string | null
  created_at: string
}

const typeConfig: Record<AlertType, { label: string; icon: typeof TrendingUp; color: string }> = {
  price: { label: 'Prix', icon: TrendingUp, color: 'text-[#FFD700]' },
  volume: { label: 'Volume', icon: Volume2, color: 'text-blue-400' },
  signal: { label: 'Signal IA', icon: Brain, color: 'text-purple-400' },
  drawdown: { label: 'Drawdown', icon: Shield, color: 'text-red-400' },
}

// Aucune alerte fabriquée : la page commence vide, l'utilisateur crée les siennes.
const SAMPLE_ALERTS: Alert[] = []

function formatValue(type: AlertType, value: number): string {
  if (type === 'price') return `$${value.toLocaleString('fr-FR')}`
  if (type === 'volume') return `$${(value / 1e6).toFixed(0)}M`
  if (type === 'signal') return `${value}% confiance`
  if (type === 'drawdown') return `${value}%`
  return value.toString()
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(SAMPLE_ALERTS)
  const [showCreate, setShowCreate] = useState(false)
  const [newAlert, setNewAlert] = useState({
    pair: 'BTC/USDT',
    type: 'price' as AlertType,
    condition: 'above' as AlertCondition,
    value: '',
  })

  const activeAlerts = alerts.filter((a) => a.is_active)
  const triggeredAlerts = alerts.filter((a) => !a.is_active && a.triggered_at)

  const handleCreate = () => {
    if (!newAlert.value) return
    const alert: Alert = {
      id: Date.now().toString(),
      pair: newAlert.pair,
      type: newAlert.type,
      condition: newAlert.condition,
      value: Number(newAlert.value),
      is_active: true,
      triggered_at: null,
      created_at: new Date().toISOString(),
    }
    setAlerts((prev) => [alert, ...prev])
    setShowCreate(false)
    setNewAlert({ pair: 'BTC/USDT', type: 'price', condition: 'above', value: '' })
  }

  const handleDelete = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const handleToggle = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-orbitron)' }}
            data-testid="alerts-title"
          >
            Alertes
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure des alertes pour ne jamais rater une opportunite
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-sm font-semibold hover:bg-[#FFD700]/20 transition-all"
          data-testid="create-alert-btn"
        >
          <Plus className="h-4 w-4" />
          Nouvelle alerte
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-white/40 mb-1">Actives</p>
            <p className="text-xl font-bold text-emerald-400" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {activeAlerts.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-white/40 mb-1">Declenchees</p>
            <p className="text-xl font-bold text-[#FFD700]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {triggeredAlerts.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-white/40 mb-1">Prix</p>
            <p className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {alerts.filter((a) => a.type === 'price').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-white/40 mb-1">Signal IA</p>
            <p className="text-xl font-bold text-purple-400" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {alerts.filter((a) => a.type === 'signal').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[#111115] border border-white/[0.08] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  Nouvelle alerte
                </h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <X className="h-4 w-4 text-white/40" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Paire</label>
                  <select
                    value={newAlert.pair}
                    onChange={(e) => setNewAlert((p) => ({ ...p, pair: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                    data-testid="alert-pair-select"
                  >
                    {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'DOGE/USDT', 'XRP/USDT', 'ADA/USDT', 'AVAX/USDT'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(typeConfig) as AlertType[]).map((type) => {
                      const config = typeConfig[type]
                      return (
                        <button
                          key={type}
                          onClick={() => setNewAlert((p) => ({ ...p, type }))}
                          data-testid={`alert-type-${type}`}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                            newAlert.type === type
                              ? 'border-[#FFD700]/30 bg-[#FFD700]/[0.05]'
                              : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                          }`}
                        >
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                          <span className="text-[10px] text-white/60">{config.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Condition</label>
                    <select
                      value={newAlert.condition}
                      onChange={(e) => setNewAlert((p) => ({ ...p, condition: e.target.value as AlertCondition }))}
                      className="w-full h-11 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                      data-testid="alert-condition-select"
                    >
                      <option value="above">Au-dessus de</option>
                      <option value="below">En-dessous de</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Valeur</label>
                    <input
                      type="number"
                      value={newAlert.value}
                      onChange={(e) => setNewAlert((p) => ({ ...p, value: e.target.value }))}
                      placeholder={newAlert.type === 'price' ? '70000' : newAlert.type === 'signal' ? '80' : '5'}
                      className="w-full h-11 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:border-[#FFD700]/50 focus:outline-none"
                      data-testid="alert-value-input"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!newAlert.value}
                  className="w-full py-3 rounded-xl bg-[#FFD700] text-[#0A0A0F] text-sm font-bold hover:bg-[#FFD700]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid="create-alert-submit"
                >
                  Creer l'alerte
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active alerts */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-emerald-400" />
          Alertes actives ({activeAlerts.length})
        </h2>
        <div className="space-y-2">
          {activeAlerts.map((alert, i) => {
            const config = typeConfig[alert.type]
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center`}>
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{alert.pair}</span>
                            <Badge variant="info" size="sm">{config.label}</Badge>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {alert.condition === 'above' ? 'Au-dessus de' : 'En-dessous de'}{' '}
                            <span className="font-medium text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                              {formatValue(alert.type, alert.value)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(alert.id)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                          data-testid={`toggle-alert-${alert.id}`}
                        >
                          <div className="w-8 h-4 rounded-full bg-emerald-500/30 relative">
                            <div className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-emerald-400" />
                          </div>
                        </button>
                        <button
                          onClick={() => handleDelete(alert.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                          data-testid={`delete-alert-${alert.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
          {activeAlerts.length === 0 && (
            <div className="py-12 text-center">
              <Bell className="h-8 w-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Aucune alerte active</p>
              <p className="text-xs text-white/30 mt-1">Cree une alerte pour commencer</p>
            </div>
          )}
        </div>
      </div>

      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-[#FFD700]" />
            Historique ({triggeredAlerts.length})
          </h2>
          <div className="space-y-2">
            {triggeredAlerts.map((alert) => {
              const config = typeConfig[alert.type]
              return (
                <Card key={alert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.02] flex items-center justify-center opacity-50">
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white/50">{alert.pair}</span>
                            <Badge variant="info" size="sm">{config.label}</Badge>
                          </div>
                          <p className="text-xs text-white/30 mt-0.5">
                            Declenchee le{' '}
                            {alert.triggered_at
                              ? new Date(alert.triggered_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : '-'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/15 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
