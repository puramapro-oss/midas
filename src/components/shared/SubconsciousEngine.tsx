'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SubconsciousEngine — Subtle subliminal layer.
 * Shows ultra-faint empowering words during loading states (>2s).
 * Uses Fibonacci timing and golden ratio opacity.
 */

const SUBLIMINAL_WORDS = [
  'ABONDANCE',
  'PUISSANCE',
  'CONFIANCE',
  'PAIX',
  'AMOUR',
  'CLARTE',
  'SUCCES',
  'SAGESSE',
];

export default function SubconsciousEngine() {
  const [word, setWord] = useState<string | null>(null);

  useEffect(() => {
    // Rotate subliminal word every 8s (Fibonacci)
    const interval = setInterval(() => {
      const random =
        SUBLIMINAL_WORDS[Math.floor(Math.random() * SUBLIMINAL_WORDS.length)];
      setWord(random);
      // Fade out after 2.1s (golden timing)
      setTimeout(() => setWord(null), 2100);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {word && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6 }}
          className="fixed inset-0 z-[1] flex items-center justify-center pointer-events-none select-none"
          aria-hidden="true"
        >
          <span
            className="text-[120px] font-black tracking-[0.3em] text-white/[0.03]"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            {word}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
