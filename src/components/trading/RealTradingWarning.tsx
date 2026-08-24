'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface RealTradingWarningProps {
  show: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Alerte critique affichée quand l'utilisateur désactive le Paper Trading
 * Extrait de BotCreator.tsx pour réduire sa taille
 */
export function RealTradingWarning({
  show,
  onConfirm,
  onCancel,
}: RealTradingWarningProps) {
  return (
    <AnimatePresence>
      {show && (
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
                  Ce bot utilisera de vrais fonds sur ton exchange. Les pertes
                  sont réelles et irréversibles. Assure-toi de bien comprendre
                  les risques avant de continuer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                data-testid="confirm-real-trading"
              >
                Je comprends les risques
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
              >
                Rester en Paper Trading
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

RealTradingWarning.displayName = 'RealTradingWarning'
export default RealTradingWarning
