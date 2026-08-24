'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { typeConfig, AlertType, AlertCondition, PAIR_OPTIONS } from './alerts-config'

interface NewAlertForm {
  pair: string
  type: AlertType
  condition: AlertCondition
  value: string
}

interface CreateAlertModalProps {
  show: boolean
  newAlert: NewAlertForm
  setNewAlert: React.Dispatch<React.SetStateAction<NewAlertForm>>
  onClose: () => void
  onCreate: () => void
}

/**
 * Modal de création d'alerte — extrait de page.tsx pour réduire sa taille
 */
export function CreateAlertModal({
  show,
  newAlert,
  setNewAlert,
  onClose,
  onCreate,
}: CreateAlertModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#111115] border border-white/[0.08] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-orbitron)' }}
              >
                Nouvelle alerte
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <X className="h-4 w-4 text-white/40" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Paire
                </label>
                <select
                  value={newAlert.pair}
                  onChange={(e) =>
                    setNewAlert((p) => ({ ...p, pair: e.target.value }))
                  }
                  className="w-full h-11 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  data-testid="alert-pair-select"
                >
                  {PAIR_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Type
                </label>
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
                        <span className="text-[10px] text-white/60">
                          {config.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                    Condition
                  </label>
                  <select
                    value={newAlert.condition}
                    onChange={(e) =>
                      setNewAlert((p) => ({
                        ...p,
                        condition: e.target.value as AlertCondition,
                      }))
                    }
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                    data-testid="alert-condition-select"
                  >
                    <option value="above">Au-dessus de</option>
                    <option value="below">En-dessous de</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                    Valeur
                  </label>
                  <input
                    type="number"
                    value={newAlert.value}
                    onChange={(e) =>
                      setNewAlert((p) => ({ ...p, value: e.target.value }))
                    }
                    placeholder={
                      newAlert.type === 'price'
                        ? '70000'
                        : newAlert.type === 'signal'
                          ? '80'
                          : '5'
                    }
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:border-[#FFD700]/50 focus:outline-none"
                    data-testid="alert-value-input"
                  />
                </div>
              </div>

              <button
                onClick={onCreate}
                disabled={!newAlert.value}
                className="w-full py-3 rounded-xl bg-[#FFD700] text-[#0A0A0F] text-sm font-bold hover:bg-[#FFD700]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="create-alert-submit"
              >
                Creer l&apos;alerte
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

CreateAlertModal.displayName = 'CreateAlertModal'
export default CreateAlertModal
