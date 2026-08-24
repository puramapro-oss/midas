'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Check, Unplug, Loader2, Wifi, WifiOff, ShieldCheck, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { Button } from '@/components/ui/Button'
import { Accordion } from '@/components/ui/Accordion'
import { exchangeDisplayNames, exchangeTutorials, getDefaultTutorial } from './exchange-config'
import { ExchangeForm } from './ExchangeForm'

export interface Exchange {
  name: string
  connected: boolean
  status: 'connected' | 'disconnected' | 'error'
}

export interface ExchangeConnectorProps {
  exchange: Exchange
  onSave?: (data: { apiKey: string; secret: string }) => void
  onTest?: () => void
  onDisconnect?: () => void
  className?: string
}

export function ExchangeConnector({
  exchange,
  onSave,
  onTest,
  onDisconnect,
  className,
}: ExchangeConnectorProps) {
  const [apiKey, setApiKey] = useState('')
  const [secret, setSecret] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)

  const displayName = exchangeDisplayNames[exchange.name] ?? exchange.name
  const isConnected = exchange.connected && exchange.status === 'connected'
  const tutorialItems =
    exchangeTutorials[exchange.name] ?? getDefaultTutorial(exchange.name)

  const handleTest = useCallback(async () => {
    if (!apiKey.trim() || !secret.trim()) return
    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/exchange/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: exchange.name,
          apiKey: apiKey.trim(),
          apiSecret: secret.trim(),
        }),
      })
      const data = await res.json()
      setTestResult(data.connected ? 'success' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setTesting(false)
    }

    onTest?.()
  }, [apiKey, secret, exchange.name, onTest])

  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (!apiKey.trim() || !secret.trim()) return
    setSaving(true)

    try {
      const res = await fetch('/api/exchange/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: exchange.name,
          apiKey: apiKey.trim(),
          apiSecret: secret.trim(),
        }),
      })

      if (res.ok) {
        onSave?.({ apiKey: apiKey.trim(), secret: secret.trim() })
      }
    } finally {
      setSaving(false)
    }
  }, [apiKey, secret, exchange.name, onSave])

  const handleDisconnect = useCallback(() => {
    setApiKey('')
    setSecret('')
    setTestResult(null)
    onDisconnect?.()
  }, [onDisconnect])

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'relative rounded-2xl border backdrop-blur-xl transition-all duration-300',
        isConnected
          ? 'bg-emerald-500/[0.02] border-emerald-500/20 hover:border-emerald-500/30'
          : 'bg-white/[0.03] border-white/[0.06] hover:border-[#FFD700]/20',
        className
      )}
      data-testid={`exchange-connector-${exchange.name}`}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Exchange name as large text since no logo files */}
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border',
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-white/[0.04] border-white/[0.08] text-white/60'
            )}
          >
            {displayName.charAt(0)}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {displayName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Connecté</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">Déconnecté</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div
          className={cn(
            'w-3 h-3 rounded-full',
            isConnected
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
              : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'
          )}
        />
      </div>

      <ExchangeForm
        exchangeName={exchange.name}
        apiKey={apiKey}
        secret={secret}
        showApiKey={showApiKey}
        showSecret={showSecret}
        onApiKeyChange={setApiKey}
        onSecretChange={setSecret}
        onToggleApiKey={() => setShowApiKey((prev) => !prev)}
        onToggleSecret={() => setShowSecret((prev) => !prev)}
      />

      {/* Test result feedback */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs mx-6',
            testResult === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}
        >
          {testResult === 'success' ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Connexion réussie — clés valides</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              <span>Échec de la connexion — vérifie tes clés</span>
            </>
          )}
        </motion.div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 space-y-3">
        <div className="flex items-center gap-2">
          {/* Test button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            onClick={handleTest}
            disabled={!apiKey.trim() || !secret.trim() || testing}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200',
              'border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/10 hover:border-[#FFD700]/50',
              (!apiKey.trim() || !secret.trim() || testing) &&
                'opacity-40 cursor-not-allowed pointer-events-none'
            )}
            data-testid={`test-connection-${exchange.name}`}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            <span>{testing ? 'Test en cours...' : 'Tester la connexion'}</span>
          </motion.button>

          {/* Save button */}
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!apiKey.trim() || !secret.trim() || saving}
            icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            data-testid={`save-exchange-${exchange.name}`}
          >
            {saving ? 'Connexion...' : 'Sauvegarder'}
          </Button>
        </div>

        {/* Disconnect (if connected) */}
        {isConnected && (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors mx-auto"
            data-testid={`disconnect-exchange-${exchange.name}`}
          >
            <Unplug className="h-3.5 w-3.5" />
            <span>Déconnecter cet exchange</span>
          </button>
        )}
      </div>

      {/* Tutorial accordion */}
      <div className="px-6 pb-6">
        <button
          type="button"
          onClick={() => setShowTutorial((prev) => !prev)}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors mb-2"
        >
          <motion.div
            animate={{ rotate: showTutorial ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.div>
          <span>
            Comment obtenir les clés API {displayName} ?
          </span>
        </button>

        {showTutorial && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Accordion items={tutorialItems} />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

ExchangeConnector.displayName = 'ExchangeConnector'
export default ExchangeConnector
