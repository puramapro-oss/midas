import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GIFT_TABLE = [
  { type: 'points', value: '10', weight: 20, label: '+10 points' },
  { type: 'points', value: '15', weight: 15, label: '+15 points' },
  { type: 'points', value: '20', weight: 5, label: '+20 points' },
  { type: 'coupon', value: '5', weight: 15, label: '-5% coupon (7j)' },
  { type: 'coupon', value: '10', weight: 10, label: '-10% coupon (7j)' },
  { type: 'ticket', value: '1', weight: 15, label: '+1 ticket tirage' },
  { type: 'credits', value: '3', weight: 10, label: '+3 crédits IA' },
  { type: 'big_points', value: '50', weight: 3, label: '+50 points' },
  { type: 'big_points', value: '100', weight: 2, label: '+100 points' },
  { type: 'coupon', value: '20', weight: 3, label: '-20% coupon (3j)' },
  { type: 'mega_coupon', value: '50', weight: 2, label: '-50% coupon (24h)' },
] as const;

function pickGift(streak: number) {
  // Streak 7j+ = guaranteed min -10% coupon
  const table = streak >= 7
    ? GIFT_TABLE.filter(g => !(g.type === 'points' && parseInt(g.value) < 20))
    : [...GIFT_TABLE];

  const totalWeight = table.reduce((sum, g) => sum + g.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const gift of table) {
    rand -= gift.weight;
    if (rand <= 0) return gift;
  }
  return table[0];
}

// GET: check if gift available today
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { data: profile } = await supabase.schema('midas').from('profiles')
      .select('last_daily_gift, daily_gift_streak')
      .eq('id', user.id).single();

    const lastGift = profile?.last_daily_gift ? new Date(profile.last_daily_gift) : null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const canClaim = !lastGift || new Date(lastGift.getFullYear(), lastGift.getMonth(), lastGift.getDate()) < today;

    return NextResponse.json({
      available: canClaim,
      streak: profile?.daily_gift_streak ?? 0,
      last_claimed: profile?.last_daily_gift,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: claim daily gift
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { data: profile } = await supabase.schema('midas').from('profiles')
      .select('last_daily_gift, daily_gift_streak, purama_points, purama_points_lifetime, daily_questions_limit, daily_questions_used')
      .eq('id', user.id).single();

    const lastGift = profile?.last_daily_gift ? new Date(profile.last_daily_gift) : null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);

    if (lastGift && new Date(lastGift.getFullYear(), lastGift.getMonth(), lastGift.getDate()) >= today) {
      return NextResponse.json({ error: 'Cadeau déjà réclamé aujourd\'hui' }, { status: 400 });
    }

    // Calculate streak
    const lastDay = lastGift ? new Date(lastGift.getFullYear(), lastGift.getMonth(), lastGift.getDate()) : null;
    const isConsecutive = lastDay && lastDay >= yesterday && lastDay < today;
    const newStreak = isConsecutive ? (profile?.daily_gift_streak ?? 0) + 1 : 1;

    const gift = pickGift(newStreak);

    // Save gift
    await supabase.schema('midas').from('daily_gifts').insert({
      user_id: user.id,
      gift_type: gift.type,
      gift_value: gift.value,
      streak_count: newStreak,
    });

    // Apply gift
    const updates: Record<string, unknown> = {
      last_daily_gift: now.toISOString(),
      daily_gift_streak: newStreak,
    };

    if (gift.type === 'points' || gift.type === 'big_points') {
      const pts = parseInt(gift.value);
      updates.purama_points = (profile?.purama_points ?? 0) + pts;
      updates.purama_points_lifetime = (profile?.purama_points_lifetime ?? 0) + pts;

      await supabase.schema('midas').from('point_transactions').insert({
        user_id: user.id, amount: pts, type: 'earn', source: 'daily_gift',
        description: `Cadeau quotidien: ${gift.label}`,
      });
    } else if (gift.type === 'credits') {
      const extra = parseInt(gift.value);
      updates.daily_questions_limit = (profile?.daily_questions_limit ?? 5) + extra;
    } else if (gift.type === 'coupon' || gift.type === 'mega_coupon') {
      const days = gift.type === 'mega_coupon' ? 1 : gift.value === '20' ? 3 : 7;
      await supabase.schema('midas').from('user_coupons').insert({
        user_id: user.id,
        code: `DAILY-${Date.now().toString(36).toUpperCase()}`,
        discount_percent: parseInt(gift.value),
        source: 'daily',
        expires_at: new Date(now.getTime() + days * 86400000).toISOString(),
      });
    } else if (gift.type === 'ticket') {
      // Add lottery ticket
      const { data: draw } = await supabase.schema('midas').from('lottery_draws')
        .select('id').eq('status', 'upcoming').order('draw_date', { ascending: true }).limit(1).single();
      if (draw) {
        await supabase.schema('midas').from('lottery_tickets').insert({
          user_id: user.id, draw_id: draw.id, source: 'partage',
        });
      }
    }

    await supabase.schema('midas').from('profiles').update(updates).eq('id', user.id);

    return NextResponse.json({
      gift: { type: gift.type, value: gift.value, label: gift.label },
      streak: newStreak,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
