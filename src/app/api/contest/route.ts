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

    // Active weekly contest
    const { data: weeklyContest } = await supabase
      .from('contests')
      .select('*')
      .eq('type', 'weekly')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Active monthly contest
    const { data: monthlyContest } = await supabase
      .from('contests')
      .select('*')
      .eq('type', 'monthly')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // User tickets for active contests
    let myWeeklyTickets = 0;
    let myMonthlyTickets = 0;

    if (weeklyContest) {
      const { data: p } = await supabase
        .from('contest_participations')
        .select('tickets')
        .eq('contest_id', weeklyContest.id)
        .eq('user_id', user.id)
        .single();
      myWeeklyTickets = p?.tickets ?? 0;
    }

    if (monthlyContest) {
      const { data: p } = await supabase
        .from('contest_participations')
        .select('tickets')
        .eq('contest_id', monthlyContest.id)
        .eq('user_id', user.id)
        .single();
      myMonthlyTickets = p?.tickets ?? 0;
    }

    // Total participants for active weekly
    let weeklyParticipants = 0;
    if (weeklyContest) {
      const { count } = await supabase
        .from('contest_participations')
        .select('id', { count: 'exact', head: true })
        .eq('contest_id', weeklyContest.id);
      weeklyParticipants = count ?? 0;
    }

    // Last 10 completed contests with winners
    const { data: pastContests } = await supabase
      .from('contests')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      weekly: weeklyContest ?? null,
      monthly: monthlyContest ?? null,
      myWeeklyTickets,
      myMonthlyTickets,
      weeklyParticipants,
      pastContests: pastContests ?? [],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
