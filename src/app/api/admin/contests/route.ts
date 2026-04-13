import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAIL = 'matiss.frasne@gmail.com';

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

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } }
  );
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const db = getServiceDb();

    const { data: contests } = await db
      .from('contests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Enrich with participant count
    const enriched = [];
    for (const c of contests ?? []) {
      const { count } = await db
        .from('contest_participations')
        .select('id', { count: 'exact', head: true })
        .eq('contest_id', c.id);

      enriched.push({
        ...c,
        participants: count ?? 0,
      });
    }

    return NextResponse.json({ contests: enriched });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { contestId } = await request.json();
    if (!contestId) {
      return NextResponse.json({ error: 'ID concours manquant' }, { status: 400 });
    }

    const db = getServiceDb();

    // Get contest
    const { data: contest } = await db
      .from('contests')
      .select('*')
      .eq('id', contestId)
      .single();

    if (!contest) {
      return NextResponse.json({ error: 'Concours introuvable' }, { status: 404 });
    }

    // Get participants
    const { data: entries } = await db
      .from('contest_participations')
      .select('user_id, tickets')
      .eq('contest_id', contestId);

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'Aucun participant' }, { status: 400 });
    }

    // Weighted random selection (by tickets)
    const pool: string[] = [];
    for (const e of entries) {
      for (let i = 0; i < (e.tickets ?? 1); i++) {
        pool.push(e.user_id);
      }
    }

    // Select up to 3 unique winners
    const winnerIds: string[] = [];
    const poolCopy = [...pool];
    const numWinners = Math.min(3, new Set(poolCopy).size);

    for (let i = 0; i < numWinners && poolCopy.length > 0; i++) {
      const idx = Math.floor(Math.random() * poolCopy.length);
      const winnerId = poolCopy[idx];
      if (!winnerIds.includes(winnerId)) {
        winnerIds.push(winnerId);
      }
      // Remove all entries for this winner
      for (let j = poolCopy.length - 1; j >= 0; j--) {
        if (poolCopy[j] === winnerId) poolCopy.splice(j, 1);
      }
    }

    // Get winner profiles
    const winners = [];
    const prizeSplit = [0.5, 0.3, 0.2]; // 50%, 30%, 20%
    for (let i = 0; i < winnerIds.length; i++) {
      const { data: profile } = await db
        .from('profiles')
        .select('full_name, email')
        .eq('id', winnerIds[i])
        .single();

      const amount = Math.round(Number(contest.prize_pool) * prizeSplit[i] * 100) / 100;
      winners.push({
        user_id: winnerIds[i],
        name: profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Anonyme',
        amount,
      });
    }

    // Update contest
    await db
      .from('contests')
      .update({ status: 'completed', winners })
      .eq('id', contestId);

    return NextResponse.json({ ok: true, winners });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
