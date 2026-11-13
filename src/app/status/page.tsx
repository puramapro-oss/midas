'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { parseStatusServices, summarizeStatusServices, type PublicServiceStatus } from '@/lib/status-contract'

export default function StatusPage() {
  const [services, setServices] = useState<PublicServiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<string>('')

  const checkStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/status', { cache: 'no-store' })
      const data = await res.json()
      setServices(parseStatusServices(data))
      setLastChecked(new Date().toLocaleTimeString('fr-FR'))
    } catch {
      setServices([{ name: 'API', status: 'down' }])
      setLastChecked(new Date().toLocaleTimeString('fr-FR'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => checkStatus());
  }, [])

  const summary = summarizeStatusServices(services, loading)
  const checking = summary === 'checking'
  const allOperational = summary === 'operational'
  const hasDegraded = summary === 'degraded'
  const hasUnknown = summary === 'unknown'

  const statusConfig = {
    operational: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Operationnel' },
    degraded: { icon: AlertCircle, color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/10', label: 'Degrade' },
    down: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Hors ligne' },
    unknown: { icon: AlertCircle, color: 'text-white/60', bg: 'bg-white/5', label: 'Non vérifié' },
  }

  return (
    <main className="min-h-screen bg-[#0A0A0F] py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-orbitron)' }} data-testid="status-title">
            Statut MIDAS
          </h1>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            checking || hasUnknown ? 'bg-white/5 border border-white/10' :
            allOperational ? 'bg-emerald-500/10 border border-emerald-500/20' :
            hasDegraded ? 'bg-[#FFD700]/10 border border-[#FFD700]/20' :
            'bg-red-500/10 border border-red-500/20'
          }`}>
            {checking ? (
              <RefreshCw className="h-4 w-4 text-white/60 animate-spin" />
            ) : allOperational ? (
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            ) : hasDegraded || hasUnknown ? (
              <AlertCircle className={`h-4 w-4 ${hasUnknown ? 'text-white/60' : 'text-[#FFD700]'}`} />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${
              checking || hasUnknown ? 'text-white/60' : allOperational ? 'text-emerald-400' : hasDegraded ? 'text-[#FFD700]' : 'text-red-400'
            }`}>
              {checking ? 'Vérification en cours' : allOperational ? 'Services vérifiés opérationnels' : hasDegraded ? 'Service vérifié dégradé' : hasUnknown ? 'État non vérifié' : 'Incident en cours'}
            </span>
          </div>
        </div>

        <div className="space-y-2" data-testid="services-list">
          {services.map((service) => {
            const config = statusConfig[service.status]
            return (
              <div
                key={service.name}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <config.icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-sm font-medium text-white/80">{service.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {service.latency !== undefined && (
                    <span className="text-xs text-white/30" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {service.latency}ms
                    </span>
                  )}
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-white/20">
          <span>Derniere verification : {lastChecked || '...'}</span>
          <button
            onClick={checkStatus}
            disabled={loading}
            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>
    </main>
  )
}
