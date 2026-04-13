import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: share stats + today's shares
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalRes, todayRes, profileRes] = await Promise.all([
      supabase.schema('midas').from('social_shares').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.schema('midas').from('social_shares').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('shared_at', today.toISOString()),
      supabase.schema('midas').from('profiles').select('referral_code, streak, purama_points').eq('id', user.id).single(),
    ]);

    const streak = profileRes.data?.streak ?? 0;
    let multiplier = 1;
    if (streak >= 100) multiplier = 10;
    else if (streak >= 60) multiplier = 7;
    else if (streak >= 30) multiplier = 5;
    else if (streak >= 14) multiplier = 3;
    else if (streak >= 7) multiplier = 2;

    return NextResponse.json({
      total_shares: totalRes.count ?? 0,
      today_shares: todayRes.count ?? 0,
      max_daily: 3,
      can_share: (todayRes.count ?? 0) < 3,
      referral_code: profileRes.data?.referral_code ?? '',
      share_link: `https://midas.purama.dev/share/${profileRes.data?.referral_code ?? ''}`,
      streak_multiplier: multiplier,
      points_per_share: 300 * multiplier,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const shareSchema = z.object({
  platform: z.string().optional(),
});

// POST: record a share
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const parsed = shareSchema.safeParse(body);
    const platform = parsed.success ? parsed.data.platform : undefined;

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase.schema('midas').from('social_shares')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('shared_at', today.toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Maximum 3 partages par jour' }, { status: 400 });
    }

    const { data: profile } = await supabase.schema('midas').from('profiles')
      .select('referral_code, streak, purama_points, purama_points_lifetime').eq('id', user.id).single();

    const streak = profile?.streak ?? 0;
    let multiplier = 1;
    if (streak >= 100) multiplier = 10;
    else if (streak >= 60) multiplier = 7;
    else if (streak >= 30) multiplier = 5;
    else if (streak >= 14) multiplier = 3;
    else if (streak >= 7) multiplier = 2;

    const pointsEarned = 300 * multiplier;
    const isFirst = (count ?? 0) === 0;
    const bonusFirst = isFirst ? 100 : 0;
    const totalPoints = pointsEarned + bonusFirst;

    // Record share
    await supabase.schema('midas').from('social_shares').insert({
      user_id: user.id,
      share_code: profile?.referral_code ?? user.id.slice(0, 8),
      platform_hint: platform ?? null,
      points_given: totalPoints,
    });

    // Award points
    const newBalance = (profile?.purama_points ?? 0) + totalPoints;
    const newLifetime = (profile?.purama_points_lifetime ?? 0) + totalPoints;
    await supabase.schema('midas').from('profiles').update({
      purama_points: newBalance,
      purama_points_lifetime: newLifetime,
    }).eq('id', user.id);

    await supabase.schema('midas').from('point_transactions').insert({
      user_id: user.id, amount: totalPoints, type: 'earn', source: 'share',
      description: `Partage${isFirst ? ' (bonus 1er du jour)' : ''} — ${platform ?? 'inconnu'}`,
    });

    return NextResponse.json({
      points_earned: totalPoints,
      balance: newBalance,
      shares_today: (count ?? 0) + 1,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
