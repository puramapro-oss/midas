'use client';

import { motion } from 'framer-motion';
import { Signal } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';

const directionConfig = {
  strong_buy: { label: 'BUY', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  buy: { label: 'BUY', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  neutral: { label: 'HOLD', bg: 'bg-white/[0.06]', text: 'text-white/50', border: 'border-white/[0.08]' },
  sell: { label: 'SELL', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  strong_sell: { label: 'SELL', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
} as const;

const rowVariant = {
  hidden: { opacity: 0, x: -12 } as const,
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24, delay: i * 0.06 },
  }),
};

export default function SignalsList() {
  const { signals, loading } = useSignals();

  return (
    <motion.div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="signals-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-orbitron)]">
        Signaux IA
      </h3>

      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      ) : signals.length === 0 ? (
        <motion.div
          className="py-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Signal className="h-8 w-8 text-white/10 mx-auto mb-3" />
          </motion.div>
          <p className="text-sm text-[var(--text-tertiary)]">Aucun signal pour le moment</p>
          <p className="text-xs text-white/20 mt-1">Les signaux IA apparaitront ici</p>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {signals.slice(0, 5).map((signal, i) => {
            const strength = signal.strength as keyof typeof directionConfig;
            const config = directionConfig[strength] ?? directionConfig.neutral;
            return (
              <motion.div
                key={signal.id}
                custom={i}
                variants={rowVariant}
                initial="hidden"
                animate="visible"
                whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.03)' }}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-semibold text-[var(--text-primary)] shrink-0">
                    {signal.pair}
                  </span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.3 + i * 0.06 }}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.bg} ${config.text} ${config.border}`}
                  >
                    {config.label}
                  </motion.span>
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {signal.confidence}%
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
