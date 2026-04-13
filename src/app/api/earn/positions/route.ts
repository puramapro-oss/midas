import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'midas' },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component — safe to ignore */ }
        },
      },
    }
  );
}

// GET — user's earn positions + history
export async function GET(request: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const tab = request.nextUrl.searchParams.get('tab') ?? 'positions';

    if (tab === 'positions') {
      const { data: positions } = await supabase
        .from('earn_positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const active = positions ?? [];
      const totalInvested = active.reduce((s, p) => s + Number(p.amount), 0);
      const totalEarnings = active.reduce((s, p) => s + Number(p.total_earnings), 0);
      const dailyEarnings = active.reduce((s, p) => s + Number(p.daily_earnings), 0);
      const avgApy = active.length > 0
        ? active.reduce((s, p) => s + Number(p.apy), 0) / active.length
        : 0;

      return NextResponse.json({
        positions: active,
        stats: { totalInvested, totalEarnings, dailyEarnings, avgApy, count: active.length },
      });
    }

    if (tab === 'history') {
      const { data: history } = await supabase
        .from('earn_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      return NextResponse.json({ history: history ?? [] });
    }

    return NextResponse.json({ error: 'Tab invalide' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const subscribeSchema = z.object({
  action: z.enum(['subscribe', 'redeem']),
  product_type: z.enum(['flexible', 'locked', 'staking', 'launchpool', 'dual_investment']).optional(),
  asset: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  apy: z.number().min(0).optional(),
  lock_period_days: z.number().min(0).optional(),
  position_id: z.string().uuid().optional(),
  auto_renew: z.boolean().optional(),
});

// POST — subscribe to earn product or redeem
export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
        { status: 400 }
      );
    }

    const { action, product_type, asset, amount, apy, lock_period_days, position_id, auto_renew } = parsed.data;

    if (action === 'subscribe') {
      if (!product_type || !asset || !amount) {
        return NextResponse.json({ error: 'product_type, asset et amount requis' }, { status: 400 });
      }

      const expiresAt = lock_period_days && lock_period_days > 0
        ? new Date(Date.now() + lock_period_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const dailyEarnings = amount * ((apy ?? 0) / 100) / 365;

      const { data: position, error } = await supabase
        .from('earn_positions')
        .insert({
          user_id: user.id,
          product_type,
          asset,
          amount,
          apy: apy ?? 0,
          daily_earnings: dailyEarnings,
          lock_period_days: lock_period_days ?? 0,
          expires_at: expiresAt,
          auto_renew: auto_renew ?? true,
          status: 'active',
          source: 'binance',
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Erreur lors de la souscription' }, { status: 500 });
      }

      await supabase.from('earn_history').insert({
        user_id: user.id,
        position_id: position.id,
        action: 'subscribe',
        asset,
        amount,
      });

      return NextResponse.json({ position, message: `${amount} ${asset} placés avec succès à ${apy ?? 0}% APY.` });
    }

    if (action === 'redeem') {
      if (!position_id) return NextResponse.json({ error: 'position_id requis' }, { status: 400 });

      const { data: pos } = await supabase
        .from('earn_positions')
        .select('*')
        .eq('id', position_id)
        .eq('user_id', user.id)
        .single();

      if (!pos) return NextResponse.json({ error: 'Position introuvable' }, { status: 404 });
      if (pos.status !== 'active') return NextResponse.json({ error: 'Position déjà clôturée' }, { status: 400 });

      if (pos.lock_period_days > 0 && pos.expires_at) {
        const expiresAt = new Date(pos.expires_at);
        if (expiresAt > new Date()) {
          return NextResponse.json({
            error: `Position verrouillée jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}. Retrait anticipé non disponible.`,
          }, { status: 400 });
        }
      }

      await supabase
        .from('earn_positions')
        .update({ status: 'redeemed', updated_at: new Date().toISOString() })
        .eq('id', position_id);

      await supabase.from('earn_history').insert({
        user_id: user.id,
        position_id,
        action: 'redeem',
        asset: pos.asset,
        amount: Number(pos.amount) + Number(pos.total_earnings),
      });

      return NextResponse.json({
        message: `${pos.asset} retiré avec succès. Gains: ${Number(pos.total_earnings).toFixed(6)} ${pos.asset}.`,
      });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
