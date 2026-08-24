'use client';

import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { TIMEFRAMES } from '@/lib/analysis/constants';

interface ChartSectionProps {
  activeTimeframe: string;
  onTimeframeChange: (tf: string) => void;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  chartLoading: boolean;
}

export default function ChartSection({ activeTimeframe, onTimeframeChange, chartContainerRef, chartLoading }: ChartSectionProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1 mb-4">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              data-testid={`tf-${tf}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTimeframe === tf
                  ? 'bg-[#FFD700] text-[#0A0A0F] shadow-[0_0_8px_rgba(255,215,0,0.2)]'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="relative w-full h-[400px] rounded-xl bg-[var(--bg-secondary)] border border-white/[0.04] overflow-hidden">
          <div
            ref={chartContainerRef}
            className="w-full h-full"
            data-testid="chart-container"
          />
          {chartLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/60 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 text-[#FFD700] animate-spin" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
