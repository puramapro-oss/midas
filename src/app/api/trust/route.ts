import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

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

// GET — compute user trust score
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const supabase = getServiceClient();

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at, streak, xp, level, email_verified, tutorial_completed')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    // Calculate trust score (0-100)
    let score = 50; // Base score for new users

    // +1 per day of account age (max +20)
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(profile.created_at as string).getTime()) / (1000 * 60 * 60 * 24)
    );
    score += Math.min(accountAgeDays, 20);

    // +5 if email verified
    if (profile.email_verified) score += 5;

    // +5 if tutorial completed
    if (profile.tutorial_completed) score += 5;

    // +1 per 7 days streak (max +10)
    score += Math.min(Math.floor((profile.streak ?? 0) / 7), 10);

    // Trade history check
    const { count: tradeCount } = await supabase
      .from('trades')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'closed');

    // +1 per 5 closed trades (max +10)
    score += Math.min(Math.floor((tradeCount ?? 0) / 5), 10);

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine tier
    let tier: 'blocked' | 'limited' | 'standard' | 'trusted' | 'verified';
    if (score < 40) tier = 'blocked';
    else if (score < 55) tier = 'limited';
    else if (score < 70) tier = 'standard';
    else if (score < 85) tier = 'trusted';
    else tier = 'verified';

    // Determine permissions
    const canWithdrawCash = score >= 70;
    const canParticipateContests = score >= 40;
    const canUseLiveTrading = score >= 55;

    return NextResponse.json({
      trust: {
        score,
        tier,
        account_age_days: accountAgeDays,
        trade_count: tradeCount ?? 0,
        streak: profile.streak ?? 0,
        permissions: {
          withdraw_cash: canWithdrawCash,
          participate_contests: canParticipateContests,
          live_trading: canUseLiveTrading,
        },
        factors: [
          { name: 'Anciennete du compte', value: Math.min(accountAgeDays, 20), max: 20 },
          { name: 'Email verifie', value: profile.email_verified ? 5 : 0, max: 5 },
          { name: 'Tutoriel complete', value: profile.tutorial_completed ? 5 : 0, max: 5 },
          { name: 'Streak', value: Math.min(Math.floor((profile.streak ?? 0) / 7), 10), max: 10 },
          { name: 'Historique trades', value: Math.min(Math.floor((tradeCount ?? 0) / 5), 10), max: 10 },
        ],
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
