'use client';

import { useState } from 'react';
import { Bot, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AutoTradeToggle() {
  const [active, setActive] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleToggle() {
    if (!active) {
      setShowConfirm(true);
    } else {
      setActive(false);
    }
  }

  function confirmActivation() {
    setActive(true);
    setShowConfirm(false);
  }

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="auto-trade-toggle"
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-orbitron)]">
        Auto-Trading
      </h3>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
              active
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-white/[0.04] text-[var(--text-tertiary)]'
            }`}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {active ? 'IA Active' : 'IA en Pause'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {active ? 'Trades automatiques activés' : 'Aucun trade automatique'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          data-testid="auto-trade-button"
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
            active
              ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-white/10'
          }`}
        >
          <motion.div
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full ${
              active ? 'bg-[var(--bg-primary)]' : 'bg-white/60'
            }`}
            animate={{ x: active ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-3 rounded-lg border border-[var(--warning)]/20 bg-[var(--warning)]/[0.06]">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  En activant le trading automatique, l&apos;IA pourra exécuter des trades sur votre portefeuille selon votre profil de risque. Vous pouvez désactiver à tout moment.
                </p>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:bg-white/[0.04] transition-colors"
                  data-testid="auto-trade-cancel"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmActivation}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                  data-testid="auto-trade-confirm"
                >
                  Activer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
