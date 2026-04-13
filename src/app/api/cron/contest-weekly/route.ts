import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'midas' } }
);

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Close active weekly contest
    const { data: activeContest } = await supabase
      .from('contests')
      .select('id, prize_pool')
      .eq('type', 'weekly')
      .eq('status', 'active')
      .single();

    if (activeContest) {
      // Get all participations for this contest
      const { data: participations } = await supabase
        .from('contest_participations')
        .select('user_id, tickets')
        .eq('contest_id', activeContest.id);

      if (participations && participations.length > 0 && activeContest.prize_pool >= 10) {
        // Weighted random draw
        const pool: string[] = [];
        for (const p of participations) {
          for (let i = 0; i < p.tickets; i++) {
            pool.push(p.user_id);
          }
        }
        const winnerId = pool[Math.floor(Math.random() * pool.length)];

        // Credit winner wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', winnerId)
          .single();

        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + activeContest.prize_pool })
            .eq('user_id', winnerId);
        } else {
          await supabase
            .from('wallets')
            .insert({ user_id: winnerId, balance: activeContest.prize_pool });
        }

        // Record transaction
        await supabase.from('wallet_transactions').insert({
          user_id: winnerId,
          type: 'credit',
          amount: activeContest.prize_pool,
          source: 'contest',
          description: `Gagnant concours hebdomadaire`,
          reference_id: activeContest.id,
        });

        // Close contest with winner
        await supabase
          .from('contests')
          .update({
            status: 'completed',
            winners: [{ user_id: winnerId, amount: activeContest.prize_pool, rank: 1 }],
          })
          .eq('id', activeContest.id);
      } else {
        // Not enough prize or no participants — report to next week
        await supabase
          .from('contests')
          .update({ status: 'completed', winners: [] })
          .eq('id', activeContest.id);
      }
    }

    // 2. Create new weekly contest
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    nextMonday.setHours(12, 0, 0, 0);

    const reportedPool = activeContest && activeContest.prize_pool < 10 ? activeContest.prize_pool : 0;

    await supabase.from('contests').insert({
      type: 'weekly',
      start_date: now.toISOString(),
      end_date: nextMonday.toISOString(),
      prize_pool: reportedPool,
      status: 'active',
    });

    return NextResponse.json({ ok: true, reported: reportedPool });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
