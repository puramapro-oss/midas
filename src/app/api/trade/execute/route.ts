import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { PLAN_LIMITS } from '@/lib/utils/constants';
import type { MidasPlan } from '@/types/stripe';
import { executeTrade } from '@/lib/trading/trade-executor';
import type { CoordinatorDecision } from '@/lib/agents/types';

const bodySchema = z.object({
  pair: z.string().min(1).max(30),
  side: z.enum(['buy', 'sell']),
  strategy: z.string().min(1).max(50),
  entryPrice: z.number().positive(),
  positionSizePct: z.number().positive().max(100),
  quoteAmount: z.number().positive().max(1000000).optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  isPaperTrade: z.boolean().default(false),
  botId: z.string().uuid().optional(),
  idempotencyKey: z.string().uuid(),
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

    const { pair, side, strategy, entryPrice, positionSizePct, quoteAmount, stopLoss, takeProfit, isPaperTrade, idempotencyKey } = parsed.data;

    // Décision Tissma D2=A (2026-09-05) : MIDAS reste un outil
    // d'information/éducation. Une demande d'ordre réel est refusée avant
    // toute lecture de clé exchange ou construction de décision actionnable.
    if (!isPaperTrade) {
      return NextResponse.json(
        { error: 'MIDAS autorise uniquement les simulations éducatives.' },
        { status: 403 },
      );
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    // Note D2=A : tout !isPaperTrade est déjà refusé 403 plus haut ; le
    // bloc historique « paper trading obligatoire 7 jours » est devenu
    // inatteignable et a été retiré.

    // Limits are enforced atomically with persistence, including concurrent requests.
    const plan = (profile.plan as MidasPlan) ?? 'free';
    const limits = PLAN_LIMITS[plan]?.limits ?? PLAN_LIMITS.free.limits;
    const dailyLimit = profile.role === 'super_admin' || !Number.isFinite(limits.daily_trades)
      ? 1000000000 : limits.daily_trades;
    const maxPositions = Number.isFinite(limits.max_positions) ? limits.max_positions : 1000000000;

    // Build coordinator decision for the trade executor
    const decision: CoordinatorDecision = {
      action: side as 'buy' | 'sell',
      pair,
      entry_price: entryPrice,
      stop_loss: stopLoss ?? 0,
      take_profit: takeProfit ?? 0,
      confidence: 0.8,
      composite_score: 0, // Manual educational input, not an AI directional forecast.
      position_size_pct: positionSizePct,
      strategy,
      reasoning: `Manual ${side} ${pair} via dashboard`,
      agent_results: [],
      risk_reward_ratio: takeProfit && stopLoss && entryPrice !== stopLoss
        ? Math.abs((takeProfit - entryPrice) / (entryPrice - stopLoss))
        : 0,
      // Honnête : décision manuelle, pas validée par le Shield coordinateur.
      // Le gate réel est exécuté par simulate() côté exécuteur.
      approved_by_shield: false,
    };

    // Execute trade (paper only, D2=A) through the full Shield pipeline
    const result = await executeTrade(decision, user.id, { quoteAmount, operationId: idempotencyKey, dailyLimit, maxPositions });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Erreur execution trade', operation_id: result.operation_id, state: result.state },
        { status: result.state === 'reconciliation_required' ? 409 : 400 }
      );
    }

    return NextResponse.json({
      trade: {
        id: result.trade_id,
        operation_id: result.operation_id,
        state: result.state,
        audit_status: result.audit_status,
        replayed: result.replayed ?? false,
        order_id: result.order_id,
        executed_price: result.executed_price,
        executed_quantity: result.executed_quantity,
        fees: result.fees,
        slippage_pct: result.slippage_pct,
        is_paper: result.is_paper,
      },
    }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
