import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const bodySchema = z.object({
  botId: z.string().uuid(),
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

    const { botId } = parsed.data;

    // === BRIEF MIDAS-BRIEF-ULTIMATE.md : paper trading 7 jours obligatoire ===
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, paper_trading_until')
      .eq('id', user.id)
      .single();

    if (
      profile?.role !== 'super_admin' &&
      profile?.paper_trading_until &&
      new Date(profile.paper_trading_until as string).getTime() > Date.now()
    ) {
      const { data: botCfg } = await supabase
        .from('bots')
        .select('id, is_paper_trade')
        .eq('id', botId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (botCfg && botCfg.is_paper_trade === false) {
        const days = Math.ceil(
          (new Date(profile.paper_trading_until as string).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        return NextResponse.json(
          {
            error: 'Paper trading obligatoire pendant 7 jours après inscription',
            days_remaining: days,
            paper_trading_until: profile.paper_trading_until,
          },
          { status: 403 },
        );
      }
    }

    // Fetch bot and verify ownership
    const { data: existingBot, error: fetchError } = await supabase
      .from('bots')
      .select('id, user_id, status')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingBot) {
      return NextResponse.json({ error: 'Bot introuvable' }, { status: 404 });
    }

    const newStatus = existingBot.status === 'active' ? 'paused' : 'active';

    const { data: bot, error: updateError } = await supabase
      .from('bots')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', botId)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError || !bot) {
      return NextResponse.json({ error: 'Erreur toggle bot', details: updateError?.message }, { status: 500 });
    }

    return NextResponse.json({ bot });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
