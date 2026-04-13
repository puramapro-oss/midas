import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: active collaborative missions
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const { data: missions } = await supabase.schema('midas').from('collaborative_missions')
      .select('*')
      .eq('status', 'active')
      .order('deadline', { ascending: true })
      .limit(10);

    // Check user participation
    const missionIds = (missions ?? []).map(m => m.id);
    const { data: myParticipation } = missionIds.length > 0
      ? await supabase.schema('midas').from('collaborative_members')
          .select('mission_id, progress, completed')
          .eq('user_id', user.id)
          .in('mission_id', missionIds)
      : { data: [] };

    const participationMap = new Map((myParticipation ?? []).map(p => [p.mission_id, p]));

    return NextResponse.json({
      missions: (missions ?? []).map(m => ({
        ...m,
        my_participation: participationMap.get(m.id) ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: join a collaborative mission
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const { mission_id } = await req.json();
    if (!mission_id) return NextResponse.json({ error: 'Mission requise' }, { status: 400 });

    // Check not already joined
    const { count } = await supabase.schema('midas').from('collaborative_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('mission_id', mission_id);

    if ((count ?? 0) > 0) return NextResponse.json({ error: 'Deja inscrit' }, { status: 400 });

    const { error } = await supabase.schema('midas').from('collaborative_members').insert({
      mission_id,
      user_id: user.id,
      progress: 0,
      completed: false,
    });

    if (error) return NextResponse.json({ error: 'Impossible de rejoindre' }, { status: 500 });

    // Increment current_participants via raw increment
    const { data: mission } = await supabase.schema('midas').from('collaborative_missions')
      .select('current_participants').eq('id', mission_id).single();
    if (mission) {
      await supabase.schema('midas').from('collaborative_missions')
        .update({ current_participants: (mission.current_participants ?? 0) + 1 })
        .eq('id', mission_id);
    }

    return NextResponse.json({ joined: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
