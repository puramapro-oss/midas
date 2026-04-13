import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { PLAN_LIMITS } from '@/lib/utils/constants';
import type { MidasPlan } from '@/types/stripe';

const bodySchema = z.object({
  pair: z.string().min(1).max(30),
  side: z.enum(['buy', 'sell']),
  strategy: z.string().min(1).max(50),
  amount: z.number().positive().max(1000000),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  isPaperTrade: z.boolean().default(false),
  botId: z.string().uuid().optional(),
  exchangeConnectionId: z.string().uuid(),
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

    const { pair, side, strategy, amount, stopLoss, takeProfit, isPaperTrade, botId, exchangeConnectionId } = parsed.data;

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan, role, daily_trades_used, daily_questions_reset_at, paper_trading_until')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    // === BRIEF MIDAS-BRIEF-ULTIMATE.md : paper trading obligatoire 7 jours ===
    // Tant que profile.paper_trading_until > now(), on FORCE isPaperTrade=true.
    // Le super_admin n'est pas concerné (il peut tester en réel).
    let effectiveIsPaperTrade = isPaperTrade;
    if (profile.role !== 'super_admin' && profile.paper_trading_until) {
      const until = new Date(profile.paper_trading_until as string);
      if (until.getTime() > Date.now()) {
        if (!isPaperTrade) {
          // Refus explicite si l'utilisateur tente d'exécuter un trade réel
          return NextResponse.json(
            {
              error: 'Paper trading obligatoire pour 7 jours après inscription',
              paper_trading_until: profile.paper_trading_until,
              days_remaining: Math.ceil((until.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            },
            { status: 403 },
          );
        }
        effectiveIsPaperTrade = true;
      }
    }

    // Check trade limits (super_admin bypass)
    if (profile.role !== 'super_admin') {
      const plan = (profile.plan as MidasPlan) ?? 'free';
      const limit = PLAN_LIMITS[plan]?.limits.daily_trades ?? 5;

      if ((profile.daily_trades_used ?? 0) >= limit) {
        return NextResponse.json(
          { error: 'Limite de trades quotidiens atteinte', limit, used: profile.daily_trades_used },
          { status: 429 }
        );
      }
    }

    // Verify exchange connection belongs to user
    const { data: exchangeConn, error: exchangeError } = await supabase
      .from('exchange_connections')
      .select('id, exchange, is_active')
      .eq('id', exchangeConnectionId)
      .eq('user_id', user.id)
      .single();

    if (exchangeError || !exchangeConn) {
      return NextResponse.json({ error: 'Connexion exchange introuvable' }, { status: 404 });
    }

    if (!exchangeConn.is_active) {
      return NextResponse.json({ error: 'Connexion exchange inactive' }, { status: 400 });
    }

    // Check max positions
    const plan = (profile.plan as MidasPlan) ?? 'free';
    const maxPositions = PLAN_LIMITS[plan]?.limits.max_positions ?? 3;

    const { count: openPositions } = await supabase
      .from('trades')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'open');

    if ((openPositions ?? 0) >= maxPositions) {
      return NextResponse.json(
        { error: 'Nombre maximum de positions atteint', max: maxPositions },
        { status: 429 }
      );
    }

    // Insert trade
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        pair,
        side,
        strategy,
        amount,
        stop_loss: stopLoss ?? null,
        take_profit: takeProfit ?? null,
        is_paper_trade: effectiveIsPaperTrade,
        bot_id: botId ?? null,
        exchange_connection_id: exchangeConnectionId,
        exchange: exchangeConn.exchange,
        status: 'open',
        entry_price: null,
        exit_price: null,
        pnl: null,
        fee: 0,
      })
      .select('*')
      .single();

    if (tradeError || !trade) {
      return NextResponse.json({ error: 'Erreur creation trade', details: tradeError?.message }, { status: 500 });
    }

    // Increment daily_trades_used
    await supabase
      .from('profiles')
      .update({
        daily_trades_used: (profile.daily_trades_used ?? 0) + 1,
      })
      .eq('id', user.id);

    return NextResponse.json({ trade }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
