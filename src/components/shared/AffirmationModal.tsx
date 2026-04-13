'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getRandomAffirmation } from '@/lib/spiritual/affirmations';

export default function AffirmationModal() {
  const [show, setShow] = useState(false);
  const [affirmation, setAffirmation] = useState('');

  useEffect(() => {
    // Show once per session (login)
    const key = 'midas_affirmation_shown';
    const lastShown = sessionStorage.getItem(key);
    if (!lastShown) {
      setAffirmation(getRandomAffirmation());
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    sessionStorage.setItem('midas_affirmation_shown', Date.now().toString());
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={handleAccept}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Golden glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#F59E0B]/5 to-transparent pointer-events-none" />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-[#7C3AED]/20 border border-[#F59E0B]/30 flex items-center justify-center"
            >
              <Sparkles className="h-7 w-7 text-[#F59E0B]" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-medium text-white/90 leading-relaxed mb-8"
            >
              &ldquo;{affirmation}&rdquo;
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAccept}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#7C3AED] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
            >
              J&apos;integre
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
