'use client';

import { useEffect, useRef } from 'react';
import Skeleton from '@/components/ui/Skeleton';
import { Card, CardContent } from '@/components/ui/Card';
import type { CandleData } from '@/lib/trading/utils';

interface TradingChartProps {
  candles: CandleData[];
  loading: boolean;
}

export default function TradingChart({ candles, loading }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    let chart: ReturnType<typeof import('lightweight-charts').createChart> | null = null;

    const initChart = async () => {
      const lc = await import('lightweight-charts');

      if (!chartContainerRef.current) return;

      chartContainerRef.current.innerHTML = '';

      chart = lc.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 420,
        layout: {
          background: { type: lc.ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255, 255, 255, 0.4)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: 'rgba(255, 215, 0, 0.03)' },
          horzLines: { color: 'rgba(255, 215, 0, 0.03)' },
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
          vertLine: { color: 'rgba(255, 215, 0, 0.3)', width: 1, style: 2 },
          horzLine: { color: 'rgba(255, 215, 0, 0.3)', width: 1, style: 2 },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.06)',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.06)',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const candlestickSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderUpColor: '#10B981',
        borderDownColor: '#EF4444',
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });

      candlestickSeries.setData(
        candles.map((c) => ({
          time: c.time as import('lightweight-charts').UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      const volumeSeries = chart.addSeries(lc.HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      volumeSeries.setData(
        candles.map((c) => ({
          time: c.time as import('lightweight-charts').UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        }))
      );

      chart.timeScale().fitContent();
      chartRef.current = chart;

      const resizeObserver = new ResizeObserver(() => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      });
      resizeObserver.observe(chartContainerRef.current);

      return () => {
        resizeObserver.disconnect();
        chart?.remove();
      };
    };

    initChart();

    return () => {
      chart?.remove();
    };
  }, [candles]);

  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="h-[420px] flex items-center justify-center">
            <Skeleton className="w-full h-full rounded-2xl" />
          </div>
        ) : (
          <div
            ref={chartContainerRef}
            className="w-full h-[420px] rounded-2xl overflow-hidden"
            data-testid="trading-chart"
          />
        )}
      </CardContent>
    </Card>
  );
}
