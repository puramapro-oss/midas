'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Trade {
  id: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  pnlUsd: number;
  pnlPercent: number;
  date: string;
  strategy: string;
}

const sampleTrades: Trade[] = [
  { id: '1', pair: 'BTC/USDT', direction: 'LONG', entry: 66800, exit: 67450, pnlUsd: 65.0, pnlPercent: 0.97, date: '29 mars 14:23', strategy: 'Momentum' },
  { id: '2', pair: 'ETH/USDT', direction: 'SHORT', entry: 3550, exit: 3480, pnlUsd: 42.0, pnlPercent: 1.97, date: '29 mars 11:08', strategy: 'Reversal' },
  { id: '3', pair: 'SOL/USDT', direction: 'LONG', entry: 148, exit: 145.5, pnlUsd: -25.0, pnlPercent: -1.69, date: '28 mars 22:45', strategy: 'Breakout' },
  { id: '4', pair: 'BTC/USDT', direction: 'LONG', entry: 66200, exit: 66950, pnlUsd: 75.0, pnlPercent: 1.13, date: '28 mars 18:12', strategy: 'Scalping' },
  { id: '5', pair: 'AVAX/USDT', direction: 'SHORT', entry: 40.2, exit: 41.1, pnlUsd: -18.0, pnlPercent: -2.24, date: '28 mars 15:30', strategy: 'Mean Rev.' },
  { id: '6', pair: 'LINK/USDT', direction: 'LONG', entry: 15.2, exit: 15.8, pnlUsd: 30.0, pnlPercent: 3.95, date: '28 mars 09:45', strategy: 'Breakout' },
  { id: '7', pair: 'ETH/USDT', direction: 'LONG', entry: 3480, exit: 3520, pnlUsd: 24.0, pnlPercent: 1.15, date: '27 mars 21:10', strategy: 'Momentum' },
  { id: '8', pair: 'BTC/USDT', direction: 'SHORT', entry: 67100, exit: 66800, pnlUsd: 30.0, pnlPercent: 0.45, date: '27 mars 16:33', strategy: 'Scalping' },
  { id: '9', pair: 'SOL/USDT', direction: 'LONG', entry: 143, exit: 147.5, pnlUsd: 45.0, pnlPercent: 3.15, date: '27 mars 12:00', strategy: 'Momentum' },
  { id: '10', pair: 'AVAX/USDT', direction: 'LONG', entry: 38.5, exit: 39.8, pnlUsd: 26.0, pnlPercent: 3.38, date: '27 mars 08:20', strategy: 'Breakout' },
];

export default function RecentActivity() {
  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="recent-activity"
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-orbitron)]">
        Activité Récente
      </h3>

      <div className="space-y-1">
        {sampleTrades.map((trade) => {
          const isWin = trade.pnlUsd >= 0;
          return (
            <div
              key={trade.id}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
              data-testid={`trade-${trade.id}`}
            >
              {/* Left */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    trade.direction === 'LONG'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {trade.direction === 'LONG' ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {trade.pair}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] px-1.5 py-0.5 rounded bg-white/[0.04]">
                      {trade.strategy}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                    {trade.date} &middot; ${trade.entry.toLocaleString('en-US')} → ${trade.exit.toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              {/* Right: P&L */}
              <div className="text-right shrink-0 ml-3">
                <p
                  className={`text-xs font-semibold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  {isWin ? '+' : ''}${trade.pnlUsd.toFixed(2)}
                </p>
                <p
                  className={`text-[10px] ${isWin ? 'text-emerald-400/60' : 'text-red-400/60'}`}
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  {isWin ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
