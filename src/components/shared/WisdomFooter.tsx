'use client';

import { useState, useEffect } from 'react';
import { getRandomQuote } from '@/lib/spiritual/affirmations';

export default function WisdomFooter() {
  const [quote, setQuote] = useState({ text: '', author: '' });

  useEffect(() => {
    setQuote(getRandomQuote());
    const interval = setInterval(() => {
      setQuote(getRandomQuote());
    }, 30 * 60 * 1000); // Rotate every 30min
    return () => clearInterval(interval);
  }, []);

  if (!quote.text) return null;

  return (
    <div className="text-center py-6 px-4 border-t border-white/[0.04]">
      <p className="text-xs text-white/25 italic max-w-md mx-auto">
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className="text-[10px] text-white/15 mt-1">— {quote.author}</p>
    </div>
  );
}
