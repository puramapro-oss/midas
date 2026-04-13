import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: my mentorships (as mentor or mentee)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const [mentorRes, menteeRes] = await Promise.all([
      supabase.schema('midas').from('mentorships')
        .select('*, mentee:mentee_id(id, full_name, avatar_url, level, streak_days)')
        .eq('mentor_id', user.id)
        .eq('status', 'active'),
      supabase.schema('midas').from('mentorships')
        .select('*, mentor:mentor_id(id, full_name, avatar_url, level, streak_days)')
        .eq('mentee_id', user.id)
        .eq('status', 'active'),
    ]);

    return NextResponse.json({
      as_mentor: mentorRes.data ?? [],
      as_mentee: menteeRes.data ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
