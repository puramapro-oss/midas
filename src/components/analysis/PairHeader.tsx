'use client';

import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { PairData } from '@/lib/analysis/constants';

interface PairHeaderProps {
  data: PairData;
  onBack: () => void;
}

export default function PairHeader({ data, onBack }: PairHeaderProps) {
  const isPositive = data.change24h >= 0;

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onBack}
        data-testid="back-button"
        className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1
            className="text-2xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-orbitron)' }}
            data-testid="pair-title"
          >
            {data.symbol}
          </h1>
          <Badge
            variant={isPositive ? 'success' : 'danger'}
            icon={isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          >
            {isPositive ? '+' : ''}{data.change24h.toFixed(1)}%
          </Badge>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{data.displayName}</p>
      </div>
      <div className="text-right">
        <p
          className="text-2xl font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          data-testid="pair-price"
        >
          ${data.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-0.5">
          <span>H: ${data.high24h.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
          <span>L: ${data.low24h.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
          <span>Vol: ${data.volume}</span>
        </div>
      </div>
    </div>
  );
}
