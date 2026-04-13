'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EMPOWERING_TEXTS, getRandomQuote } from '@/lib/spiritual/affirmations';

/**
 * SpiritualLayer — Invisible wrapper for the dashboard.
 * Orchestrates:
 * 1. Micro-pause every 25 min (3s breathing reminder)
 * 2. Subliminal loading words (on long waits)
 * 3. Awakening XP tracking via API
 */
export default function SpiritualLayer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showPause, setShowPause] = useState(false);
  const pauseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityRef = useRef(Date.now());

  // Track last user activity
  useEffect(() => {
    const onActivity = () => {
      activityRef.current = Date.now();
    };
    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, []);

  // Micro-pause every 25 minutes of active use
  useEffect(() => {
    pauseTimer.current = setInterval(() => {
      const idleMs = Date.now() - activityRef.current;
      // Only show if user has been active in last 2 min
      if (idleMs < 2 * 60 * 1000) {
        setShowPause(true);
        setTimeout(() => setShowPause(false), 3000);
      }
    }, 25 * 60 * 1000);

    return () => {
      if (pauseTimer.current) clearInterval(pauseTimer.current);
    };
  }, []);

  // Track awakening event on mount (session start)
  useEffect(() => {
    const key = 'midas_awakening_tracked';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'session_start', points: 10 }),
      }).catch(() => {});
    }
  }, []);

  return (
    <>
      {children}

      {/* Micro-pause overlay */}
      <AnimatePresence>
        {showPause && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-5 text-center"
            >
              <p className="text-lg text-white/70 font-light">Respire.</p>
              <p className="text-xs text-white/30 mt-1">
                {getRandomQuote().text.slice(0, 60)}...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
