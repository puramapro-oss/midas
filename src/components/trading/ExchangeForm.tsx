'use client'

import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'

interface ExchangeFormProps {
  exchangeName: string
  apiKey: string
  secret: string
  showApiKey: boolean
  showSecret: boolean
  onApiKeyChange: (value: string) => void
  onSecretChange: (value: string) => void
  onToggleApiKey: () => void
  onToggleSecret: () => void
}

export function ExchangeForm({
  exchangeName,
  apiKey,
  secret,
  showApiKey,
  showSecret,
  onApiKeyChange,
  onSecretChange,
  onToggleApiKey,
  onToggleSecret,
}: ExchangeFormProps) {
  return (
    <div className="px-6 space-y-3">
      {/* API Key */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/40">Clé API</label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="Colle ta clé API ici..."
            className={cn(
              'w-full h-11 px-4 pr-10 rounded-xl border bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 font-mono',
              'border-white/[0.08] hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)]'
            )}
            data-testid={`api-key-input-${exchangeName}`}
          />
          <button
            type="button"
            onClick={onToggleApiKey}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            aria-label={showApiKey ? 'Masquer la clé API' : 'Afficher la clé API'}
          >
            {showApiKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Secret */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/40">Secret</label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            value={secret}
            onChange={(e) => onSecretChange(e.target.value)}
            placeholder="Colle ton secret ici..."
            className={cn(
              'w-full h-11 px-4 pr-10 rounded-xl border bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 font-mono',
              'border-white/[0.08] hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)]'
            )}
            data-testid={`api-secret-input-${exchangeName}`}
          />
          <button
            type="button"
            onClick={onToggleSecret}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            aria-label={showSecret ? 'Masquer le secret' : 'Afficher le secret'}
          >
            {showSecret ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
