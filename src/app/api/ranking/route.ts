import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
          } catch { /* Server Component */ }
        },
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Current month active or completed ranking
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: currentRanking } = await supabase
      .from('ranking_contests')
      .select('*')
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    // Top 10 for current ranking
    let top10: {
      pseudo: string;
      total_score: number;
      risk_score: number;
      regularity_score: number;
      preservation_score: number;
      loyalty_score: number;
      rank: number;
      prize_amount: number;
      is_me: boolean;
    }[] = [];

    let myRanking: {
      pseudo: string;
      total_score: number;
      risk_score: number;
      regularity_score: number;
      preservation_score: number;
      loyalty_score: number;
      rank: number;
      prize_amount: number;
    } | null = null;

    if (currentRanking) {
      const { data: rankings } = await supabase
        .from('portfolio_rankings')
        .select('pseudo, total_score, risk_score, regularity_score, preservation_score, loyalty_score, rank, prize_amount, user_id')
        .eq('ranking_contest_id', currentRanking.id)
        .order('total_score', { ascending: false })
        .limit(10);

      if (rankings) {
        top10 = rankings.map((r) => ({
          pseudo: r.pseudo,
          total_score: Number(r.total_score),
          risk_score: Number(r.risk_score),
          regularity_score: Number(r.regularity_score),
          preservation_score: Number(r.preservation_score),
          loyalty_score: Number(r.loyalty_score),
          rank: r.rank ?? 0,
          prize_amount: Number(r.prize_amount),
          is_me: r.user_id === user.id,
        }));
      }

      // My ranking (if not in top 10)
      const { data: myData } = await supabase
        .from('portfolio_rankings')
        .select('pseudo, total_score, risk_score, regularity_score, preservation_score, loyalty_score, rank, prize_amount')
        .eq('ranking_contest_id', currentRanking.id)
        .eq('user_id', user.id)
        .single();

      if (myData) {
        myRanking = {
          pseudo: myData.pseudo,
          total_score: Number(myData.total_score),
          risk_score: Number(myData.risk_score),
          regularity_score: Number(myData.regularity_score),
          preservation_score: Number(myData.preservation_score),
          loyalty_score: Number(myData.loyalty_score),
          rank: myData.rank ?? 0,
          prize_amount: Number(myData.prize_amount),
        };
      }
    }

    // Previous month completed rankings (last 3)
    const { data: pastRankings } = await supabase
      .from('ranking_contests')
      .select('*')
      .eq('status', 'completed')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(3);

    return NextResponse.json({
      currentRanking: currentRanking ?? null,
      top10,
      myRanking,
      pastRankings: pastRankings ?? [],
      currentMonth,
      currentYear,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
