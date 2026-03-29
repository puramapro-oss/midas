import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { PLAN_LIMITS } from '@/lib/utils/constants';
import type { MidasPlan } from '@/types/stripe';

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  exchangeConnectionId: z.string().uuid(),
  strategy: z.string().min(1).max(50),
  pair: z.string().min(1).max(30),
  allocatedCapital: z.number().positive().max(10_000_000),
  riskPerTrade: z.number().positive().max(100),
  stopLossPct: z.number().positive().max(100),
  takeProfitPct: z.number().positive().max(1000).optional(),
  isPaperTrading: z.boolean().default(false),
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

    const {
      name,
      exchangeConnectionId,
      strategy,
      pair,
      allocatedCapital,
      riskPerTrade,
      stopLossPct,
      takeProfitPct,
      isPaperTrading,
    } = parsed.data;

    // Fetch profile for plan limits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    // Check max bots (super_admin bypass)
    if (profile.role !== 'super_admin') {
      const plan = (profile.plan as MidasPlan) ?? 'free';
      const maxBots = PLAN_LIMITS[plan]?.limits.max_bots ?? 1;

      const { count: currentBots } = await supabase
        .from('bots')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((currentBots ?? 0) >= maxBots) {
        return NextResponse.json(
          { error: 'Nombre maximum de bots atteint', max: maxBots },
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

    // Insert bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .insert({
        user_id: user.id,
        name,
        exchange_connection_id: exchangeConnectionId,
        exchange: exchangeConn.exchange,
        strategy,
        pair,
        allocated_capital: allocatedCapital,
        risk_per_trade: riskPerTrade,
        stop_loss_pct: stopLossPct,
        take_profit_pct: takeProfitPct ?? null,
        is_paper_trading: isPaperTrading,
        status: 'paused',
        total_trades: 0,
        total_pnl: 0,
        win_rate: 0,
      })
      .select('*')
      .single();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Erreur creation bot', details: botError?.message }, { status: 500 });
    }

    return NextResponse.json({ bot }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
