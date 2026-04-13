'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Zap } from 'lucide-react';

const shieldLevels = [
  { id: 1, label: 'Max Drawdown Jour', active: true },
  { id: 2, label: 'Max Drawdown Total', active: true },
  { id: 3, label: 'Stop Loss Auto', active: true },
  { id: 4, label: 'Taille Position Max', active: true },
  { id: 5, label: 'Correlation Max', active: true },
  { id: 6, label: 'Volatilite Filtre', active: true },
  { id: 7, label: 'Cooldown Post-Perte', active: true },
];

const barVariant = {
  hidden: { width: 0 } as const,
  visible: (i: number) => ({
    width: '100%',
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 18,
      delay: 0.3 + i * 0.08,
    },
  }),
};

export default function ShieldStatus() {
  const allActive = shieldLevels.every((l) => l.active);

  return (
    <motion.div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="shield-status"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
          </motion.div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-orbitron)]">
            Bouclier de Protection
          </h3>
        </div>
        {allActive && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, type: 'spring' }}
            className="text-[10px] font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
          >
            7/7 Actifs
          </motion.span>
        )}
      </div>

      {/* Shield level bars */}
      <div className="space-y-2 mb-5">
        {shieldLevels.map((level, i) => (
          <div key={level.id} className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--text-tertiary)] w-36 shrink-0">
              {level.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                custom={i}
                variants={barVariant}
                initial="hidden"
                animate="visible"
                className={`h-full rounded-full ${
                  level.active
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                    : 'bg-red-500'
                }`}
              />
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className={`text-[10px] font-medium w-8 text-right ${
                level.active ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {level.active ? 'ON' : 'OFF'}
            </motion.span>
          </div>
        ))}
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/[0.06]">
        <motion.div
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.04)' }}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0" />
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Perte jour</p>
            <p
              className="text-sm font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              data-testid="shield-daily-loss"
            >
              12€{' '}
              <span className="text-[var(--text-tertiary)] font-normal">/ 50€</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.04)' }}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] transition-colors"
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          </motion.div>
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Circuit Breaker</p>
            <p className="text-sm font-semibold text-emerald-400" data-testid="shield-circuit-breaker">
              Inactif ✓
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
