'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Bot, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Toggle } from '@/components/ui/Toggle'

export interface BotCreatorFormData {
  name: string
  exchange: string
  pair: string
  strategy: string
  capital: number
  riskPerTrade: number
  stopLoss: number
  takeProfit: number
  isPaperTrading: boolean
}

export interface BotCreatorProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: BotCreatorFormData) => void
  className?: string
}

const exchangeOptions = [
  { value: 'binance', label: 'Binance' },
  { value: 'bybit', label: 'Bybit' },
  { value: 'okx', label: 'OKX' },
  { value: 'bitget', label: 'Bitget' },
  { value: 'kucoin', label: 'KuCoin' },
  { value: 'kraken', label: 'Kraken' },
]

const pairOptions = [
  { value: 'BTC/USDT', label: 'BTC/USDT' },
  { value: 'ETH/USDT', label: 'ETH/USDT' },
  { value: 'SOL/USDT', label: 'SOL/USDT' },
  { value: 'BNB/USDT', label: 'BNB/USDT' },
  { value: 'XRP/USDT', label: 'XRP/USDT' },
  { value: 'ADA/USDT', label: 'ADA/USDT' },
  { value: 'DOGE/USDT', label: 'DOGE/USDT' },
  { value: 'AVAX/USDT', label: 'AVAX/USDT' },
  { value: 'LINK/USDT', label: 'LINK/USDT' },
  { value: 'MATIC/USDT', label: 'MATIC/USDT' },
]

const strategyOptions = [
  { value: 'dca', label: 'DCA (Dollar Cost Averaging)' },
  { value: 'grid', label: 'Grid Trading' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'scalping', label: 'Scalping' },
]

export function BotCreator({
  isOpen,
  onClose,
  onSubmit,
  className,
}: BotCreatorProps) {
  const [name, setName] = useState('')
  const [exchange, setExchange] = useState('')
  const [pair, setPair] = useState('')
  const [strategy, setStrategy] = useState('')
  const [capital, setCapital] = useState('')
  const [riskPerTrade, setRiskPerTrade] = useState(1)
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [isPaperTrading, setIsPaperTrading] = useState(true)
  const [showRealWarning, setShowRealWarning] = useState(false)

  const handlePaperTradingToggle = useCallback((checked: boolean) => {
    if (!checked) {
      setShowRealWarning(true)
    } else {
      setShowRealWarning(false)
    }
    setIsPaperTrading(checked)
  }, [])

  const confirmRealTrading = useCallback(() => {
    setShowRealWarning(false)
  }, [])

  const cancelRealTrading = useCallback(() => {
    setIsPaperTrading(true)
    setShowRealWarning(false)
  }, [])

  const isValid =
    name.trim().length > 0 &&
    exchange.length > 0 &&
    pair.length > 0 &&
    strategy.length > 0 &&
    Number(capital) > 0 &&
    Number(stopLoss) > 0 &&
    Number(takeProfit) > 0

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!isValid) return

      onSubmit({
        name: name.trim(),
        exchange,
        pair,
        strategy,
        capital: Number(capital),
        riskPerTrade,
        stopLoss: Number(stopLoss),
        takeProfit: Number(takeProfit),
        isPaperTrading,
      })
    },
    [
      isValid,
      name,
      exchange,
      pair,
      strategy,
      capital,
      riskPerTrade,
      stopLoss,
      takeProfit,
      isPaperTrading,
      onSubmit,
    ]
  )

  const resetForm = useCallback(() => {
    setName('')
    setExchange('')
    setPair('')
    setStrategy('')
    setCapital('')
    setRiskPerTrade(1)
    setStopLoss('')
    setTakeProfit('')
    setIsPaperTrading(true)
    setShowRealWarning(false)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  // Escape to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    },
    [handleClose]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          onKeyDown={handleKeyDown}
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#0A0D14] backdrop-blur-xl shadow-2xl scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Créer un bot de trading"
            data-testid="bot-creator-modal"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0A0D14]/95 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-[#FFD700]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Créer un Bot
                  </h2>
                  <p className="text-[10px] text-white/40">
                    Configure ton bot de trading automatisé
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Fermer"
                data-testid="modal-close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {/* Name */}
              <Input
                label="Nom du bot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mon Bot BTC"
                data-testid="bot-name-input"
              />

              {/* Exchange + Pair */}
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Exchange"
                  options={exchangeOptions}
                  value={exchange}
                  onChange={setExchange}
                  placeholder="Choisir..."
                />
                <Select
                  label="Paire"
                  options={pairOptions}
                  value={pair}
                  onChange={setPair}
                  placeholder="Choisir..."
                />
              </div>

              {/* Strategy */}
              <Select
                label="Stratégie"
                options={strategyOptions}
                value={strategy}
                onChange={setStrategy}
                placeholder="Sélectionner une stratégie..."
              />

              {/* Capital */}
              <Input
                label="Capital (USDT)"
                type="number"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder="Ex: 500"
                data-testid="bot-capital-input"
              />

              {/* Risk per trade slider */}
              <Slider
                label="Risque par trade"
                min={0.5}
                max={2}
                step={0.1}
                value={riskPerTrade}
                onChange={setRiskPerTrade}
                formatValue={(v) => `${v.toFixed(1)}%`}
              />

              {/* Stop Loss + Take Profit */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Stop Loss (%)"
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Ex: 2"
                  data-testid="bot-stoploss-input"
                />
                <Input
                  label="Take Profit (%)"
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="Ex: 4"
                  data-testid="bot-takeprofit-input"
                />
              </div>

              {/* Paper trading toggle */}
              <div className="space-y-3">
                <Toggle
                  checked={isPaperTrading}
                  onChange={handlePaperTradingToggle}
                  label={isPaperTrading ? 'Paper Trading' : 'Trading Réel'}
                  description={
                    isPaperTrading
                      ? 'Mode simulation — aucun risque financier'
                      : 'Attention — utilise de vrais fonds'
                  }
                />

                {/* Real trading warning */}
                <AnimatePresence>
                  {showRealWarning && !isPaperTrading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-red-400">
                              Mode Trading Réel
                            </p>
                            <p className="text-xs text-red-400/70 leading-relaxed">
                              Ce bot utilisera de vrais fonds sur ton exchange.
                              Les pertes sont réelles et irréversibles. Assure-toi
                              de bien comprendre les risques avant de continuer.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={confirmRealTrading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                            data-testid="confirm-real-trading"
                          >
                            Je comprends les risques
                          </button>
                          <button
                            type="button"
                            onClick={cancelRealTrading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
                          >
                            Rester en Paper Trading
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!isValid}
                  icon={<Zap className="h-4 w-4" />}
                  className="w-full"
                  data-testid="create-bot-button"
                >
                  Créer le Bot
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

BotCreator.displayName = 'BotCreator'
export default BotCreator
