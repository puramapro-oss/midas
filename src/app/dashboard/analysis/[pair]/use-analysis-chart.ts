import { useEffect, useRef, useState } from 'react';
import type { PairData } from '@/lib/analysis/constants';

export function useAnalysisChart(activeTimeframe: string, symbol: string, setData: React.Dispatch<React.SetStateAction<PairData>>) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    let chart: ReturnType<typeof import('lightweight-charts').createChart> | null = null;
    let cancelled = false;
    setChartLoading(true);

    const tfMap: Record<string, '1m' | '5m' | '15m' | '1h' | '4h' | '1d'> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1D': '1d',
      '1W': '1d',
    };
    const tf = tfMap[activeTimeframe] ?? '1h';

    const init = async () => {
      try {
        const lc = await import('lightweight-charts');
        const res = await fetch(
          `/api/market/candles?pair=${encodeURIComponent(symbol)}&timeframe=${tf}&limit=200`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('candles_failed');
        const json = (await res.json()) as { candles: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> };
        if (cancelled || !chartContainerRef.current) return;

        const candles = json.candles ?? [];
        if (candles.length >= 2) {
          const last = candles[candles.length - 1];
          const first = candles[0];
          const high24 = candles.reduce((m, c) => Math.max(m, c.high), 0);
          const low24 = candles.reduce((m, c) => (m === 0 ? c.low : Math.min(m, c.low)), 0);
          const vol = candles.reduce((s, c) => s + c.volume, 0);
          const changePct = first.open > 0 ? ((last.close - first.open) / first.open) * 100 : 0;
          setData((prev) => ({
            ...prev,
            price: last.close,
            change24h: changePct,
            high24h: high24,
            low24h: low24,
            volume: vol >= 1e9 ? `${(vol / 1e9).toFixed(2)}B` : `${(vol / 1e6).toFixed(0)}M`,
          }));
        }

        chartContainerRef.current.innerHTML = '';
        chart = lc.createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 400,
          layout: {
            background: { type: lc.ColorType.Solid, color: 'transparent' },
            textColor: 'rgba(255,255,255,0.4)',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: 'rgba(255,215,0,0.03)' },
            horzLines: { color: 'rgba(255,215,0,0.03)' },
          },
          rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
          timeScale: {
            borderColor: 'rgba(255,255,255,0.06)',
            timeVisible: true,
            secondsVisible: false,
          },
        });
        const series = chart.addSeries(lc.CandlestickSeries, {
          upColor: '#10B981',
          downColor: '#EF4444',
          borderUpColor: '#10B981',
          borderDownColor: '#EF4444',
          wickUpColor: '#10B981',
          wickDownColor: '#EF4444',
        });
        series.setData(
          (json.candles ?? []).map((c) => ({
            time: Math.floor(c.timestamp / 1000) as import('lightweight-charts').UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
        chart.timeScale().fitContent();
        const ro = new ResizeObserver(() => {
          if (chartContainerRef.current && chart) {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
          }
        });
        ro.observe(chartContainerRef.current);
      } catch {
        // chart silently empty on error
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    };
    void init();

    return () => {
      cancelled = true;
      if (chart) {
        try {
          chart.remove();
        } catch {
          // Chart already removed or unavailable
        }
      }
    };
  }, [activeTimeframe, symbol, setData]);

  return { chartContainerRef, chartLoading };
}
