'use client';

import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface Position {
  id: string;
  pair: string;
  exchange: string;
  entry: number;
  current: number;
  pnlUsd: number;
  pnlPercent: number;
  strategy: string;
}

const samplePositions: Position[] = [
  {
    id: '1',
    pair: 'BTC/USDT',
    exchange: 'Binance',
    entry: 67250.0,
    current: 68797.5,
    pnlUsd: 154.75,
    pnlPercent: 2.3,
    strategy: 'Momentum',
  },
  {
    id: '2',
    pair: 'ETH/USDT',
    exchange: 'Kraken',
    entry: 3520.0,
    current: 3502.4,
    pnlUsd: -17.6,
    pnlPercent: -0.5,
    strategy: 'Mean Reversion',
  },
  {
    id: '3',
    pair: 'SOL/USDT',
    exchange: 'Binance',
    entry: 142.8,
    current: 148.12,
    pnlUsd: 53.2,
    pnlPercent: 3.72,
    strategy: 'Breakout',
  },
];

export default function OpenPositions() {
  const positions = samplePositions;

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="open-positions"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-orbitron)]">
          Positions Ouvertes
        </h3>
        <span
          className="text-xs text-[var(--text-tertiary)] px-2 py-0.5 rounded-md bg-white/[0.04]"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          {positions.length} active{positions.length > 1 ? 's' : ''}
        </span>
      </div>

      {positions.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="w-6 h-6" />}
          title="Aucune position ouverte"
          description="Vos positions actives apparaîtront ici."
        />
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-white/[0.06]">
                <th className="text-left pb-3 font-medium">Paire</th>
                <th className="text-left pb-3 font-medium">Exchange</th>
                <th className="text-right pb-3 font-medium">Entry</th>
                <th className="text-right pb-3 font-medium">Current</th>
                <th className="text-right pb-3 font-medium">P&L ($)</th>
                <th className="text-right pb-3 font-medium">P&L (%)</th>
                <th className="text-left pb-3 font-medium">Strategy</th>
                <th className="text-right pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const isPositive = pos.pnlPercent >= 0;
                return (
                  <tr
                    key={pos.id}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                    data-testid={`position-${pos.pair.replace('/', '-').toLowerCase()}`}
                  >
                    <td className="py-3">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {pos.pair}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-[var(--text-secondary)]">{pos.exchange}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className="text-xs text-[var(--text-secondary)]"
                        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                      >
                        ${pos.entry.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className="text-xs text-[var(--text-primary)]"
                        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                      >
                        ${pos.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
                        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                      >
                        {isPositive ? '+' : ''}${pos.pnlUsd.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        )}
                        <span
                          className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
                          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                        >
                          {isPositive ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-[var(--text-secondary)] px-2 py-0.5 rounded bg-white/[0.04]">
                        {pos.strategy}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                        aria-label={`Fermer position ${pos.pair}`}
                        data-testid={`close-position-${pos.id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
