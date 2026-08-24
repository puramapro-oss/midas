'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { PAIRS } from '@/lib/trading/constants';

interface PairSelectorProps {
  selectedPair: string;
  onSelect: (pair: string) => void;
}

export default function PairSelector({ selectedPair, onSelect }: PairSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#FFD700]/30 transition-all"
        data-testid="pair-selector"
      >
        <div className="w-7 h-7 rounded-lg bg-[#FFD700]/10 flex items-center justify-center text-[10px] font-bold text-[#FFD700]">
          {selectedPair.split('/')[0].substring(0, 2)}
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedPair}</span>
        <ChevronDown className="h-4 w-4 text-white/30" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            className="absolute top-full mt-2 left-0 z-50 w-52 max-h-64 overflow-y-auto rounded-xl bg-[#111115] border border-white/[0.08] shadow-2xl"
          >
            {PAIRS.map((pair) => (
              <button
                key={pair}
                onClick={() => {
                  onSelect(pair);
                  setOpen(false);
                }}
                data-testid={`select-pair-${pair.replace('/', '-').toLowerCase()}`}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.04] transition-colors ${
                  pair === selectedPair ? 'text-[#FFD700] bg-[#FFD700]/[0.05]' : 'text-white/70'
                }`}
              >
                {pair}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
