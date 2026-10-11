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
import { fetchHistoricalKlines } from '@/lib/exchange/binance-public';
import { historicalWindow } from '@/lib/exchange/candle-contract';
import { BACKTEST_STRATEGIES, BACKTEST_TIMEFRAMES, backtestWarmup } from '@/lib/trading/backtest-contract';
import { checkRateLimit } from '@/lib/utils/rate-limiter';

const bodySchema = z.object({
  pair: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,15}\/[A-Z0-9]{1,15}$/),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  strategy: z.enum(BACKTEST_STRATEGIES),
  capital: z.number().positive().max(10000000).default(10000),
  stopLossPct: z.number().min(0.1).max(50).default(3),
  takeProfitPct: z.number().min(0.1).max(100).default(6),
  timeframe: z.enum(BACKTEST_TIMEFRAMES).default('4h'),
  leverage: z.literal(1).default(1),
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
      throw new Error('Unsupported backtest strategy');
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, 'free' as MidasPlan);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes, réessaie dans un instant.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
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
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs || endMs > Date.now() ||
        new Date(startMs).toISOString().slice(0, 10) !== startDate.slice(0, 10) ||
        new Date(endMs).toISOString().slice(0, 10) !== endDate.slice(0, 10)) {
      return NextResponse.json({ error: 'La date de fin doit etre posterieure a la date de debut' }, { status: 400 });
    }

    const maxRangeMs = 732 * 24 * 60 * 60 * 1000;
    if (endMs - startMs > maxRangeMs) {
      return NextResponse.json({ error: 'La plage de dates ne peut pas depasser 2 ans' }, { status: 400 });
    }

    try { historicalWindow(startMs, endMs, timeframe); }
    catch { return NextResponse.json({ error: 'Choisis une periode plus courte ou des bougies plus longues (5000 bougies maximum).' }, { status: 400 }); }
    const marketData = await fetchHistoricalKlines(pair, timeframe, startMs, endMs);
    const candles = marketData.candles as Candle[];

    if (!marketData.complete || candles.length < backtestWarmup(strategy) + 2) {
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
      slippage_pct: 0.05,
      take_profit_pct: takeProfitPct,
      stop_loss_pct: stopLossPct,
      trailing_stop: false,
      trailing_stop_pct: 1,
      max_concurrent_positions: 1,
      use_ai_signals: false,
      custom_params: {},
    };

    // Create strategy instance
    const strategyInstance = createStrategy(strategy, pair, timeframe, capital);

    // Run backtest
    const result = await runBacktest(config, candles, strategyInstance);

    return NextResponse.json({ result, market_data_source: marketData.sources.join(', '),
      coverage: { complete: true, first_open_time: marketData.first, end_exclusive: marketData.endExclusive,
        candles: candles.length, warmup_candles: backtestWarmup(strategy) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
