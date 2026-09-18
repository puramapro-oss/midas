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
import { fetchKlinesWithSource } from '@/lib/exchange/binance-public';

const bodySchema = z.object({
  pair: z.string().min(1).max(30),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  strategy: z.string().min(1).max(50),
  capital: z.number().positive().max(10000000).default(10000),
  stopLossPct: z.number().min(0.1).max(50).default(3),
  takeProfitPct: z.number().min(0.1).max(100).default(6),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).default('4h'),
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

    const marketData = await fetchKlinesWithSource(pair, timeframe, 1000);
    const candles = marketData.candles.filter((candle) => candle.timestamp >= startMs && candle.timestamp <= endMs) as Candle[];

    if (candles.length < 50) {
      return NextResponse.json({ error: 'Historique reel insuffisant pour cette periode; aucun backtest synthetique genere' }, { status: 503 });
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

    return NextResponse.json({ result, market_data_source: marketData.source });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
