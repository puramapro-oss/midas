'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Coins, Tag, Ticket, Sparkles, X } from 'lucide-react';

interface GiftResult {
  type: string;
  value: string;
  label: string;
}

const GIFT_ICONS: Record<string, typeof Coins> = {
  points: Coins,
  big_points: Sparkles,
  coupon: Tag,
  mega_coupon: Tag,
  ticket: Ticket,
  credits: Sparkles,
};

export default function DailyGiftModal() {
  const [available, setAvailable] = useState(false);
  const [streak, setStreak] = useState(0);
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [gift, setGift] = useState<GiftResult | null>(null);
  const [revealed, setRevealed] = useState(false);

  const checkGift = useCallback(async () => {
    try {
      const res = await fetch('/api/daily-gift');
      if (!res.ok) return;
      const data = await res.json();
      setAvailable(data.available);
      setStreak(data.streak);
      if (data.available) setOpen(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // Check after 2s delay to not block initial load
    const timer = setTimeout(checkGift, 2000);
    return () => clearTimeout(timer);
  }, [checkGift]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch('/api/daily-gift', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGift(data.gift);
        setStreak(data.streak);
        setTimeout(() => setRevealed(true), 500);
      }
    } finally {
      setClaiming(false);
    }
  };

  if (!available && !open) return null;

  const GiftIcon = gift ? (GIFT_ICONS[gift.type] ?? Gift) : Gift;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => gift && setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-sm border border-amber-500/20 relative"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-white/30 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              {!gift ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="inline-block"
                  >
                    <Gift className="w-16 h-16 text-amber-400 mx-auto" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-white mt-4">Cadeau quotidien</h2>
                  <p className="text-white/50 text-sm mt-1">
                    Streak : {streak} jour{streak > 1 ? 's' : ''} 🔥
                  </p>
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
                  >
                    {claiming ? 'Ouverture...' : 'Ouvrir le coffre'}
                  </button>
                </>
              ) : (
                <AnimatePresence>
                  {revealed && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      <GiftIcon className="w-16 h-16 text-amber-400 mx-auto" />
                      <h2 className="text-xl font-bold text-white mt-4">Félicitations !</h2>
                      <p className="text-amber-400 font-bold text-lg mt-2">{gift.label}</p>
                      <p className="text-white/50 text-sm mt-1">
                        Streak : {streak} jour{streak > 1 ? 's' : ''} 🔥
                      </p>
                      <button
                        onClick={() => setOpen(false)}
                        className="mt-6 w-full py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition-all"
                      >
                        Super !
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
