import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { buildSubWallets } from '@/lib/wealth/smart-split';
import { REVENUE_ENGINES, NATURE_REWARDS, REVENUE_SPLIT } from '@/lib/wealth/types';

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

// GET — full wealth engine dashboard data
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const supabase = getServiceClient();

    // Fetch sub-wallets
    const { data: walletData } = await supabase
      .from('smart_wallets')
      .select('wallet_type, balance, locked_until')
      .eq('user_id', user.id);

    const balances: Record<string, number> = {};
    (walletData ?? []).forEach((w) => {
      balances[w.wallet_type as string] = Number(w.balance) || 0;
    });

    const subWallets = buildSubWallets(balances);
    const totalBalance = subWallets.reduce((sum, w) => sum + w.balance, 0);

    // Fetch Purama Card data
    const { data: cardData } = await supabase
      .from('purama_cards')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch nature score
    const { data: natureData } = await supabase
      .from('nature_activities')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    const activitiesCount = natureData?.length ?? 0;
    const daysActive = new Set(
      (natureData ?? []).map((a) => new Date(a.id as string).toDateString())
    ).size;

    const natureScore = daysActive > 0
      ? Math.round(50 + Math.min(activitiesCount / daysActive / 5, 1) * 50)
      : 50;

    // Lifetime earnings
    const { data: earningsData } = await supabase
      .from('wealth_earnings')
      .select('engine_id, amount')
      .eq('user_id', user.id);

    const earningsByEngine: Record<string, number> = {};
    (earningsData ?? []).forEach((e) => {
      const id = e.engine_id as string;
      earningsByEngine[id] = (earningsByEngine[id] ?? 0) + (Number(e.amount) || 0);
    });

    const totalLifetimeEarnings = Object.values(earningsByEngine).reduce((s, v) => s + v, 0);

    // Active engines with earnings
    const engines = REVENUE_ENGINES.map((e) => ({
      ...e,
      lifetime_earnings: Math.round((earningsByEngine[e.id] ?? 0) * 100) / 100,
    }));

    return NextResponse.json({
      wealth: {
        total_balance: Math.round(totalBalance * 100) / 100,
        sub_wallets: subWallets,
        card: cardData ? {
          active: true,
          nature_score: cardData.nature_score ?? natureScore,
          total_cashback: cardData.total_cashback ?? 0,
          monthly_cashback: cardData.monthly_cashback ?? 0,
        } : {
          active: false,
          nature_score: natureScore,
          total_cashback: 0,
          monthly_cashback: 0,
        },
        engines,
        active_engines_count: engines.filter((e) => e.active).length,
        total_lifetime_earnings: Math.round(totalLifetimeEarnings * 100) / 100,
        nature_score: natureScore,
        nature_rewards: NATURE_REWARDS,
        revenue_split: REVENUE_SPLIT,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
