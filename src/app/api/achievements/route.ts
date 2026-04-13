import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: list all achievements + user's unlocked ones
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const [allRes, unlockedRes] = await Promise.all([
      supabase.schema('midas').from('achievements').select('*').order('category'),
      supabase.schema('midas').from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', user.id),
    ]);

    const unlockedMap = new Map((unlockedRes.data ?? []).map(u => [u.achievement_id, u.unlocked_at]));
    const achievements = (allRes.data ?? []).map(a => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlocked_at: unlockedMap.get(a.id) ?? null,
    }));

    return NextResponse.json({
      achievements,
      total: achievements.length,
      unlocked_count: unlockedMap.size,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
