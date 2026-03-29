'use client';

import Sparkline from '@/components/charts/Sparkline';

interface Signal {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  sparklineData: number[];
}

const sampleSignals: Signal[] = [
  {
    id: '1',
    pair: 'BTC/USDT',
    direction: 'BUY',
    confidence: 87,
    sparklineData: [64, 65, 63, 66, 68, 67, 69, 71, 70, 72],
  },
  {
    id: '2',
    pair: 'ETH/USDT',
    direction: 'HOLD',
    confidence: 52,
    sparklineData: [35, 34, 36, 35, 34, 35, 36, 35, 34, 35],
  },
  {
    id: '3',
    pair: 'SOL/USDT',
    direction: 'BUY',
    confidence: 74,
    sparklineData: [140, 138, 142, 145, 143, 146, 148, 147, 150, 152],
  },
  {
    id: '4',
    pair: 'AVAX/USDT',
    direction: 'SELL',
    confidence: 68,
    sparklineData: [42, 41, 40, 39, 41, 38, 37, 38, 36, 35],
  },
  {
    id: '5',
    pair: 'LINK/USDT',
    direction: 'BUY',
    confidence: 63,
    sparklineData: [14, 13, 14, 15, 14, 15, 16, 15, 16, 17],
  },
];

const directionConfig = {
  BUY: {
    label: 'BUY',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  SELL: {
    label: 'SELL',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
  HOLD: {
    label: 'HOLD',
    bg: 'bg-white/[0.06]',
    text: 'text-white/50',
    border: 'border-white/[0.08]',
  },
};

export default function SignalsList() {
  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="signals-list"
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-orbitron)]">
        Signaux IA
      </h3>

      <div className="space-y-2.5">
        {sampleSignals.map((signal) => {
          const config = directionConfig[signal.direction];
          return (
            <div
              key={signal.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors"
              data-testid={`signal-${signal.pair.replace('/', '-').toLowerCase()}`}
            >
              {/* Left: pair + badge */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-semibold text-[var(--text-primary)] shrink-0">
                  {signal.pair}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.bg} ${config.text} ${config.border}`}
                >
                  {config.label}
                </span>
              </div>

              {/* Right: sparkline + confidence */}
              <div className="flex items-center gap-4">
                <Sparkline
                  data={signal.sparklineData}
                  color="auto"
                  width={64}
                  height={24}
                />
                <span
                  className="text-xs font-medium text-[var(--text-secondary)] w-10 text-right"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  {signal.confidence}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
