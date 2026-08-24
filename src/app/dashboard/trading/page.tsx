'use client';

import { useState, useEffect, useCallback } from 'react';
import AIDisclosure from '@/lib/legal/components/AIDisclosure';
import { fetchRealCandles, type CandleData } from '@/lib/trading/utils';
import PairSelector from '@/components/trading/PairSelector';
import TimeframeSelector from '@/components/trading/TimeframeSelector';
import PriceDisplay from '@/components/trading/PriceDisplay';
import TradingChart from '@/components/trading/TradingChart';
import SignalPanel from '@/components/trading/SignalPanel';
import RecentSignals from '@/components/trading/RecentSignals';

export default function TradingPage() {
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    fetchRealCandles(selectedPair, selectedTimeframe)
      .then((data) => {
        if (!cancelled) setCandles(data);
      })
      .catch(() => {
        if (!cancelled) setCandles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPair, selectedTimeframe]);

  const handleAnalyze = useCallback(() => {
    setAnalyzing(true);
    setTimeout(() => setAnalyzing(false), 2000);
  }, []);

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  return (
    <div className="space-y-4">
      <AIDisclosure
        appName="MIDAS"
        extra="Ce n'est pas un conseil personnalisé : MIDAS n'est ni CIF (conseiller en investissement financier) ni PSAN (prestataire de services sur actifs numériques)."
        className="text-[11px] text-white/40 border border-white/[0.06] bg-white/[0.02] rounded-xl px-4 py-2.5"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PairSelector selectedPair={selectedPair} onSelect={setSelectedPair} />
          <PriceDisplay lastCandle={lastCandle} prevCandle={prevCandle} />
        </div>
        <TimeframeSelector selected={selectedTimeframe} onSelect={setSelectedTimeframe} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <TradingChart candles={candles} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <SignalPanel
            selectedPair={selectedPair}
            analyzing={analyzing}
            onAnalyze={handleAnalyze}
          />
        </div>
      </div>

      <RecentSignals />
    </div>
  )
}
