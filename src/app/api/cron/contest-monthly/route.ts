import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'midas' } }
);

const SPLITS = [0.60, 0.25, 0.15]; // 3 winners

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Close active monthly contest
    const { data: activeContest } = await supabase
      .from('contests')
      .select('id, prize_pool')
      .eq('type', 'monthly')
      .eq('status', 'active')
      .single();

    if (activeContest) {
      const { data: participations } = await supabase
        .from('contest_participations')
        .select('user_id, tickets')
        .eq('contest_id', activeContest.id);

      if (participations && participations.length > 0 && activeContest.prize_pool >= 50) {
        // Weighted random draw — 3 winners (no duplicates)
        const pool: string[] = [];
        for (const p of participations) {
          for (let i = 0; i < p.tickets; i++) {
            pool.push(p.user_id);
          }
        }

        const winners: { user_id: string; amount: number; rank: number }[] = [];
        const drawn = new Set<string>();

        for (let rank = 0; rank < Math.min(3, participations.length); rank++) {
          let winnerId: string;
          let attempts = 0;
          do {
            winnerId = pool[Math.floor(Math.random() * pool.length)];
            attempts++;
          } while (drawn.has(winnerId) && attempts < 100);

          if (drawn.has(winnerId)) break;
          drawn.add(winnerId);

          const prize = Math.round(activeContest.prize_pool * SPLITS[rank] * 100) / 100;
          winners.push({ user_id: winnerId, amount: prize, rank: rank + 1 });

          // Credit wallet
          const { data: wallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', winnerId)
            .single();

          if (wallet) {
            await supabase.from('wallets').update({ balance: wallet.balance + prize }).eq('user_id', winnerId);
          } else {
            await supabase.from('wallets').insert({ user_id: winnerId, balance: prize });
          }

          await supabase.from('wallet_transactions').insert({
            user_id: winnerId,
            type: 'credit',
            amount: prize,
            source: 'contest',
            description: `Concours mensuel — ${rank + 1}${rank === 0 ? 'er' : 'e'} place`,
            reference_id: activeContest.id,
          });
        }

        await supabase
          .from('contests')
          .update({ status: 'completed', winners })
          .eq('id', activeContest.id);
      } else {
        await supabase
          .from('contests')
          .update({ status: 'completed', winners: [] })
          .eq('id', activeContest.id);
      }
    }

    // 2. Create new monthly contest
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 12, 0, 0);
    const reported = activeContest && activeContest.prize_pool < 50 ? activeContest.prize_pool : 0;

    await supabase.from('contests').insert({
      type: 'monthly',
      start_date: now.toISOString(),
      end_date: nextMonth.toISOString(),
      prize_pool: reported,
      status: 'active',
    });

    return NextResponse.json({ ok: true, reported });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
