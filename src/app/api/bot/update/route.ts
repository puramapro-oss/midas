import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const bodySchema = z.object({
  botId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  strategy: z.string().min(1).max(50).optional(),
  pair: z.string().min(1).max(30).optional(),
  allocatedCapital: z.number().positive().max(10_000_000).optional(),
  riskPerTrade: z.number().positive().max(100).optional(),
  stopLossPct: z.number().positive().max(100).optional(),
  takeProfitPct: z.number().positive().max(1000).nullable().optional(),
  isPaperTrading: z.boolean().optional(),
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

export async function PUT(request: Request) {
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

    const { botId, ...fields } = parsed.data;

    // Verify bot belongs to user
    const { data: existingBot, error: fetchError } = await supabase
      .from('bots')
      .select('id, user_id')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingBot) {
      return NextResponse.json({ error: 'Bot introuvable' }, { status: 404 });
    }

    // Build update object with snake_case keys
    const updateData: Record<string, unknown> = {};
    if (fields.name !== undefined) updateData.name = fields.name;
    if (fields.strategy !== undefined) updateData.strategy = fields.strategy;
    if (fields.pair !== undefined) updateData.pair = fields.pair;
    if (fields.allocatedCapital !== undefined) updateData.allocated_capital = fields.allocatedCapital;
    if (fields.riskPerTrade !== undefined) updateData.risk_per_trade = fields.riskPerTrade;
    if (fields.stopLossPct !== undefined) updateData.stop_loss_pct = fields.stopLossPct;
    if (fields.takeProfitPct !== undefined) updateData.take_profit_pct = fields.takeProfitPct;
    if (fields.isPaperTrading !== undefined) updateData.is_paper_trading = fields.isPaperTrading;
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length <= 1) {
      return NextResponse.json({ error: 'Aucun champ a mettre a jour' }, { status: 400 });
    }

    const { data: bot, error: updateError } = await supabase
      .from('bots')
      .update(updateData)
      .eq('id', botId)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError || !bot) {
      return NextResponse.json({ error: 'Erreur mise a jour bot', details: updateError?.message }, { status: 500 });
    }

    return NextResponse.json({ bot });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
