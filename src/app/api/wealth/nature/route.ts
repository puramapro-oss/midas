import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NATURE_REWARDS, NATURE_DAILY_CAP } from '@/lib/wealth/types';

const claimSchema = z.object({
  activity_key: z.string().min(1),
  proof_type: z.enum(['self_report', 'healthkit', 'photo', 'gps']).default('self_report'),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } }
  );
}

// GET — list available nature rewards + today's claims
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayClaims } = await supabase
      .from('nature_activities')
      .select('activity_key, amount_eur, created_at')
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString());

    const todayTotal = (todayClaims ?? []).reduce((s, c) => s + (Number(c.amount_eur) || 0), 0);
    const claimedKeys = new Set((todayClaims ?? []).map((c) => c.activity_key));

    const rewards = NATURE_REWARDS.map((r) => ({
      ...r,
      claimed_today: claimedKeys.has(r.key),
    }));

    return NextResponse.json({
      rewards,
      today_total: Math.round(todayTotal * 100) / 100,
      daily_cap: NATURE_DAILY_CAP,
      remaining: Math.round((NATURE_DAILY_CAP - todayTotal) * 100) / 100,
      claims_today: todayClaims?.length ?? 0,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — claim a nature reward
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 });
    }

    const { activity_key, proof_type } = parsed.data;
    const supabase = getServiceClient();

    // Find the reward
    const reward = NATURE_REWARDS.find((r) => r.key === activity_key);
    if (!reward) {
      return NextResponse.json({ error: 'Activite inconnue' }, { status: 404 });
    }

    // Check daily cap
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayClaims } = await supabase
      .from('nature_activities')
      .select('amount_eur')
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString());

    const todayTotal = (todayClaims ?? []).reduce((s, c) => s + (Number(c.amount_eur) || 0), 0);

    if (todayTotal + reward.amount_eur > NATURE_DAILY_CAP) {
      return NextResponse.json({
        error: `Plafond quotidien atteint (${NATURE_DAILY_CAP} EUR)`,
        today_total: todayTotal,
      }, { status: 429 });
    }

    // Record activity
    await supabase.from('nature_activities').insert({
      user_id: user.id,
      activity_key,
      amount_eur: reward.amount_eur,
      proof_type,
    });

    // Credit to principal wallet
    const { data: wallet } = await supabase
      .from('smart_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .eq('wallet_type', 'principal')
      .single();

    const currentBalance = Number(wallet?.balance) || 0;
    await supabase.from('smart_wallets').upsert(
      {
        user_id: user.id,
        wallet_type: 'principal',
        balance: Math.round((currentBalance + reward.amount_eur) * 100) / 100,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,wallet_type' }
    );

    return NextResponse.json({
      ok: true,
      reward: reward.label,
      amount: reward.amount_eur,
      new_total: Math.round((todayTotal + reward.amount_eur) * 100) / 100,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
