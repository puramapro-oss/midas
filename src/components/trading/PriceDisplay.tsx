'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatPrice, type CandleData } from '@/lib/trading/utils';

interface PriceDisplayProps {
  lastCandle: CandleData | undefined;
  prevCandle: CandleData | undefined;
}

export default function PriceDisplay({ lastCandle, prevCandle }: PriceDisplayProps) {
  if (!lastCandle || !prevCandle) return null;

  const priceChange = ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100;
  const isPositive = priceChange >= 0;

  return (
    <div className="flex items-baseline gap-3">
      <span
        className="text-2xl font-bold text-[var(--text-primary)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        ${formatPrice(lastCandle.close)}
      </span>
      <span
        className={`flex items-center gap-1 text-sm font-medium ${
          isPositive ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        {isPositive ? '+' : ''}
        {priceChange.toFixed(2)}%
      </span>
    </div>
  );
}
