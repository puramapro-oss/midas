import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: list circles + user's memberships
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const [circlesRes, membershipsRes] = await Promise.all([
      supabase.schema('midas').from('love_circles').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.schema('midas').from('circle_members').select('circle_id, role, streak_days').eq('user_id', user.id),
    ]);

    const memberMap = new Map((membershipsRes.data ?? []).map(m => [m.circle_id, m]));
    const circles = (circlesRes.data ?? []).map(c => ({
      ...c,
      is_member: memberMap.has(c.id),
      my_role: memberMap.get(c.id)?.role ?? null,
    }));

    return NextResponse.json({ circles });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const joinSchema = z.object({ circle_id: z.string().uuid() });

// POST: join a circle
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'ID du cercle invalide' }, { status: 400 });

    const { data: circle } = await supabase.schema('midas').from('love_circles')
      .select('*').eq('id', parsed.data.circle_id).single();

    if (!circle) return NextResponse.json({ error: 'Cercle introuvable' }, { status: 404 });
    if (circle.current_members >= circle.max_members) {
      return NextResponse.json({ error: 'Ce cercle est complet' }, { status: 400 });
    }

    const { error } = await supabase.schema('midas').from('circle_members').insert({
      circle_id: circle.id, user_id: user.id,
    });

    if (error?.code === '23505') return NextResponse.json({ error: 'Tu fais déjà partie de ce cercle' }, { status: 400 });
    if (error) return NextResponse.json({ error: 'Impossible de rejoindre' }, { status: 500 });

    // Update member count
    await supabase.schema('midas').from('love_circles')
      .update({ current_members: circle.current_members + 1, status: circle.current_members + 1 >= circle.max_members ? 'full' : 'active' })
      .eq('id', circle.id);

    return NextResponse.json({ joined: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
