'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SAMPLE_DATA, getDefaultData, type PairData } from '@/lib/analysis/constants';
import { useAnalysisChart } from './use-analysis-chart';
import PairHeader from '@/components/analysis/PairHeader';
import ChartSection from '@/components/analysis/ChartSection';
import AIScoresSection from '@/components/analysis/AIScoresSection';
import SignalSection from '@/components/analysis/SignalSection';
import TradePanel from '@/components/analysis/TradePanel';
import QuickStats from '@/components/analysis/QuickStats';

export default function PairAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const pairSlug = (params?.pair as string) ?? 'btc-usdt';
  const fallback = SAMPLE_DATA[pairSlug] ?? getDefaultData(pairSlug);
  const [data, setData] = useState<PairData>(fallback);
  const [activeTimeframe, setActiveTimeframe] = useState<string>('1h');

  const { chartContainerRef, chartLoading } = useAnalysisChart(activeTimeframe, data.symbol, setData);

  return (
    <div className="space-y-6">
      <PairHeader data={data} onBack={() => router.back()} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChartSection
            activeTimeframe={activeTimeframe}
            onTimeframeChange={setActiveTimeframe}
            chartContainerRef={chartContainerRef}
            chartLoading={chartLoading}
          />
          <AIScoresSection scores={data.scores} />
          <SignalSection signal={data.signal} reasoning={data.reasoning} />
        </div>

        <div className="space-y-6">
          <TradePanel />
          <QuickStats data={data} />
        </div>
      </div>
    </div>
  );
}
