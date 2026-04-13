'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'midas-intro-seen';

export default function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen) {
      onComplete();
      return;
    }
    setVisible(true);

    const timer = setTimeout(() => {
      finish();
    }, 3800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onComplete();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <motion.h1
            className="text-5xl font-bold tracking-[0.3em] sm:text-7xl"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              background: 'linear-gradient(135deg, #FFD700, #FFC107, #B8860B, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            MIDAS
          </motion.h1>

          {/* Gold glow behind logo */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 300,
              height: 300,
              background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.5 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />

          {/* Tagline */}
          <motion.p
            className="mt-4 text-sm tracking-[0.2em] text-amber-200/70 sm:text-base"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8, ease: 'easeOut' }}
          >
            Trading IA Nouvelle G&eacute;n&eacute;ration
          </motion.p>

          {/* Skip button */}
          <motion.button
            onClick={finish}
            className="absolute bottom-8 right-8 text-xs text-white/30 transition-colors hover:text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Passer &rarr;
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
