'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';

const rowVariant = {
  hidden: { opacity: 0, x: 12 } as const,
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24, delay: i * 0.06 },
  }),
};

export default function RecentActivity() {
  const { recentTrades: closedTrades, loading } = useTrades();

  return (
    <motion.div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="recent-activity"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-orbitron)]">
        Activite Recente
      </h3>

      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      ) : closedTrades.length === 0 ? (
        <motion.div
          className="py-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Clock className="h-8 w-8 text-white/10 mx-auto mb-3" />
          </motion.div>
          <p className="text-sm text-[var(--text-tertiary)]">Aucun trade recent</p>
          <p className="text-xs text-white/20 mt-1">Tes trades termines apparaitront ici</p>
        </motion.div>
      ) : (
        <div className="space-y-1">
          {closedTrades.map((trade, i) => {
            const pnl = Number(trade.pnl ?? 0);
            const isWin = pnl >= 0;
            return (
              <motion.div
                key={trade.id}
                custom={i}
                variants={rowVariant}
                initial="hidden"
                animate="visible"
                whileHover={{ x: -4, backgroundColor: 'rgba(255,255,255,0.03)' }}
                className="flex items-center justify-between py-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      trade.side === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {trade.side === 'buy' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  </motion.div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{trade.pair}</span>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                      ${Number(trade.entry_price).toLocaleString('en-US')} → ${Number(trade.exit_price ?? 0).toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
                <motion.div
                  className="text-right shrink-0 ml-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                >
                  <p className={`text-xs font-semibold ${isWin ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {isWin ? '+' : ''}${pnl.toFixed(2)}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
