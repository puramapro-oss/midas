'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Eye, EyeOff, Check, ExternalLink } from 'lucide-react'

interface StepConnectExchangeProps {
  onNext: (exchange: string | null) => void
  onSkip: () => void
}

const exchanges = [
  { id: 'binance', name: 'Binance', color: '#F0B90B', logo: 'B' },
  { id: 'kraken', name: 'Kraken', color: '#5741D9', logo: 'K' },
  { id: 'bybit', name: 'Bybit', color: '#F7A600', logo: 'By' },
  { id: 'okx', name: 'OKX', color: '#FFFFFF', logo: 'O' },
  { id: 'coinbase', name: 'Coinbase', color: '#0052FF', logo: 'C' },
]

export default function StepConnectExchange({ onNext, onSkip }: StepConnectExchangeProps) {
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  const selected = exchanges.find((e) => e.id === selectedExchange)

  function handleConnect() {
    if (selectedExchange && apiKey && apiSecret) {
      onNext(selectedExchange)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-bold text-[var(--text-primary)] mb-2"
          style={{ fontFamily: 'var(--font-orbitron)' }}
          data-testid="exchange-title"
        >
          Connecter un exchange
        </h2>
        <p className="text-[var(--text-secondary)] text-sm">
          Liez votre exchange pour le trading automatise (optionnel)
        </p>
      </div>

      {/* Exchange grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
        {exchanges.map((ex, i) => {
          const isActive = selectedExchange === ex.id
          return (
            <motion.button
              key={ex.id}
              onClick={() => setSelectedExchange(isActive ? null : ex.id)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              whileTap={{ scale: 0.95 }}
              data-testid={`exchange-${ex.id}`}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                isActive
                  ? 'border-[#FFD700]/40 bg-[#FFD700]/[0.06] shadow-[0_0_20px_rgba(255,215,0,0.1)]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }`}
            >
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FFD700] flex items-center justify-center"
                >
                  <Check className="w-2.5 h-2.5 text-[#0A0A0F]" />
                </motion.div>
              )}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{
                  background: `${ex.color}15`,
                  color: ex.color,
                }}
              >
                {ex.logo}
              </div>
              <span className="text-xs text-[var(--text-secondary)]">{ex.name}</span>
            </motion.button>
          )
        })}
      </div>

      {/* API key fields */}
      <AnimatePresence mode="wait">
        {selectedExchange && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-[#FFD700]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Cles API {selected?.name}
                </span>
                <a
                  href={`https://www.${selectedExchange}.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-[#FFD700]/60 hover:text-[#FFD700] flex items-center gap-1 transition-colors"
                >
                  Guide <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 ml-1">
                  Cle API
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Votre cle API"
                  data-testid="api-key-input"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#FFD700]/40 focus:shadow-[0_0_0_3px_rgba(255,215,0,0.08)] focus:outline-none transition-all text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 ml-1">
                  Secret API
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Votre secret API"
                    data-testid="api-secret-input"
                    className="w-full px-4 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#FFD700]/40 focus:shadow-[0_0_0_3px_rgba(255,215,0,0.08)] focus:outline-none transition-all text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    data-testid="toggle-secret"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                Utilisez des cles en lecture seule ou avec permissions de trading limitees.
                Vos cles sont chiffrees et ne sont jamais stockees en clair.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          data-testid="exchange-skip"
          className="flex-1 py-3 rounded-xl border border-white/[0.08] text-[var(--text-secondary)] text-sm hover:bg-white/[0.04] transition-all"
        >
          Plus tard
        </button>
        <motion.button
          onClick={handleConnect}
          disabled={!selectedExchange || !apiKey || !apiSecret}
          whileTap={selectedExchange && apiKey && apiSecret ? { scale: 0.97 } : undefined}
          whileHover={selectedExchange && apiKey && apiSecret ? { scale: 1.02 } : undefined}
          data-testid="exchange-next"
          className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#FFD700] text-[#0A0A0F] font-semibold text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Connecter
        </motion.button>
      </div>
    </motion.div>
  )
}
