'use client';

import { motion } from 'framer-motion';
import { TIMEFRAMES } from '@/lib/trading/constants';

interface TimeframeSelectorProps {
  selected: string;
  onSelect: (timeframe: string) => void;
}

export default function TimeframeSelector({ selected, onSelect }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.id}
          onClick={() => onSelect(tf.id)}
          data-testid={`timeframe-${tf.id}`}
          className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selected === tf.id ? 'text-[#0A0A0F]' : 'text-white/40 hover:text-white/60'
          }`}
        >
          {selected === tf.id && (
            <motion.div
              layoutId="timeframe-indicator"
              className="absolute inset-0 rounded-lg bg-[#FFD700]"
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          )}
          <span className="relative">{tf.label}</span>
        </button>
      ))}
    </div>
  );
}
