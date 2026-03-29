import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { runBacktest } from '@/lib/trading/backtest-engine';
import { MomentumStrategy } from '@/lib/trading/strategies/momentum';
import { MeanReversionStrategy } from '@/lib/trading/strategies/mean-reversion';
import { GridStrategy } from '@/lib/trading/strategies/grid';
import { ScalpingStrategy } from '@/lib/trading/strategies/scalping';
import { SwingStrategy } from '@/lib/trading/strategies/swing';
import { DCAStrategy } from '@/lib/trading/strategies/dca';
import { SmartEntryStrategy } from '@/lib/trading/strategies/smart-entry';
import { PLAN_LIMITS } from '@/lib/utils/constants';
import type { MidasPlan } from '@/types/stripe';
import type { Candle, BacktestConfig } from '@/types/trading';
import type { BaseStrategy } from '@/lib/trading/strategies/base-strategy';

const bodySchema = z.object({
  pair: z.string().min(1).max(30),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  strategy: z.string().min(1).max(50),
  capital: z.number().positive().max(10000000).default(10000),
  stopLossPct: z.number().min(0.1).max(50).default(3),
  takeProfitPct: z.number().min(0.1).max(100).default(6),
  timeframe: z.string().default('4h'),
  leverage: z.number().min(1).max(125).default(1),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

function createStrategy(strategyName: string, pair: string, timeframe: string, capital: number): BaseStrategy {
  const config = {
    pair,
    timeframe,
    risk_per_trade: 0.02,
    allocated_capital: capital,
  };

  switch (strategyName) {
    case 'momentum':
      return new MomentumStrategy(config);
    case 'mean_reversion':
      return new MeanReversionStrategy(config);
    case 'grid':
      return new GridStrategy(config);
    case 'scalping':
      return new ScalpingStrategy(config);
    case 'swing':
      return new SwingStrategy(config);
    case 'dca':
      return new DCAStrategy(config);
    case 'smart_entry':
      return new SmartEntryStrategy(config);
    default:
      return new MomentumStrategy(config);
  }
}

function generateHistoricalCandles(pair: string, startDate: string, endDate: string, timeframe: string): Candle[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  const timeframeMs: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };

  const interval = timeframeMs[timeframe] ?? 4 * 60 * 60 * 1000;
  const basePrice = pair.includes('BTC') ? 62000 : pair.includes('ETH') ? 3200 : pair.includes('SOL') ? 130 : 1;
  const candles: Candle[] = [];
  let price = basePrice;

  for (let ts = start; ts <= end; ts += interval) {
    const volatility = basePrice * 0.012;
    const trend = Math.sin(ts / (30 * 24 * 60 * 60 * 1000)) * volatility * 0.3;
    const noise = (Math.random() - 0.5) * volatility;
    const change = trend + noise;

    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.4;
    const low = Math.min(open, close) - Math.random() * volatility * 0.4;
    const volume = basePrice * (200 + Math.random() * 2000);

    candles.push({
      timestamp: ts,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2)),
    });

    price = Math.max(close, basePrice * 0.3); // prevent negative prices
  }

  return candles;
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { pair, startDate, endDate, strategy, capital, stopLossPct, takeProfitPct, timeframe, leverage } = parsed.data;

    // Verify pro+ plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, plan, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    if (profile.role !== 'super_admin') {
      const plan = (profile.plan as MidasPlan) ?? 'free';
      const hasBacktest = PLAN_LIMITS[plan]?.limits.backtesting ?? false;
      if (!hasBacktest) {
        return NextResponse.json(
          { error: 'Le backtesting necessite un plan Pro ou superieur', required_plan: 'pro' },
          { status: 403 }
        );
      }
    }

    // Validate date range
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    if (endMs <= startMs) {
      return NextResponse.json({ error: 'La date de fin doit etre posterieure a la date de debut' }, { status: 400 });
    }

    const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year max
    if (endMs - startMs > maxRangeMs) {
      return NextResponse.json({ error: 'La plage de dates ne peut pas depasser 1 an' }, { status: 400 });
    }

    // Generate historical candle data (in production, fetch from DB/exchange cache)
    const candles = generateHistoricalCandles(pair, startDate, endDate, timeframe);

    if (candles.length < 50) {
      return NextResponse.json({ error: 'Pas assez de donnees pour cette periode. Essayez un timeframe plus court.' }, { status: 400 });
    }

    // Build backtest config
    const config: BacktestConfig = {
      symbol: pair,
      timeframe: timeframe as BacktestConfig['timeframe'],
      strategy,
      start_date: startDate,
      end_date: endDate,
      initial_capital: capital,
      leverage,
      fee_rate: 0.001,
      slippage_pct: 0.0005,
      take_profit_pct: takeProfitPct / 100,
      stop_loss_pct: stopLossPct / 100,
      trailing_stop: false,
      trailing_stop_pct: 0.02,
      max_concurrent_positions: 1,
      use_ai_signals: false,
      custom_params: {},
    };

    // Create strategy instance
    const strategyInstance = createStrategy(strategy, pair, timeframe, capital);

    // Run backtest
    const result = await runBacktest(config, candles, strategyInstance);

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
