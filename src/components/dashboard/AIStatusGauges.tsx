'use client';

import RingGauge from '@/components/charts/RingGauge';

const gauges = [
  { value: 75, label: 'Score Global', color: '#06B6D4' },
  { value: 82, label: 'Technique', color: '#10B981' },
  { value: 68, label: 'Sentiment', color: '#A855F7' },
  { value: 71, label: 'On-Chain', color: '#FF6B00' },
];

export default function AIStatusGauges() {
  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="ai-status-gauges"
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-5 font-[family-name:var(--font-orbitron)]">
        Analyse IA
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gauges.map((gauge) => (
          <RingGauge
            key={gauge.label}
            value={gauge.value}
            label={gauge.label}
            color={gauge.color}
            size={100}
          />
        ))}
      </div>
    </div>
  );
}
