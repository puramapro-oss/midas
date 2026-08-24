'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Plus, Trash2, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import {
  Alert,
  AlertType,
  AlertCondition,
  typeConfig,
  SAMPLE_ALERTS,
  formatValue,
} from './alerts-config'
import { CreateAlertModal } from './CreateAlertModal'

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

      <CreateAlertModal
        show={showCreate}
        newAlert={newAlert}
        setNewAlert={setNewAlert}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

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
