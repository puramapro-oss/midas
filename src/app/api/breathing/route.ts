import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: user's breathing sessions
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const { data: sessions } = await supabase.schema('midas').from('breath_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const { count: totalSessions } = await supabase.schema('midas').from('breath_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      sessions: sessions ?? [],
      total: totalSessions ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const sessionSchema = z.object({
  technique: z.enum(['4-7-8', 'box', 'coherent', 'wim_hof']),
  duration_seconds: z.number().int().min(10).max(1800),
  cycles: z.number().int().min(1).max(100),
});

// POST: record a breathing session (+30 points, max 3/day)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const body = await req.json();
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 });

    // Daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase.schema('midas').from('breath_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Maximum 3 sessions par jour' }, { status: 400 });
    }

    const { data: session, error } = await supabase.schema('midas').from('breath_sessions').insert({
      user_id: user.id,
      technique: parsed.data.technique,
      duration_seconds: parsed.data.duration_seconds,
      cycles: parsed.data.cycles,
    }).select().single();

    if (error) return NextResponse.json({ error: 'Impossible de sauvegarder' }, { status: 500 });

    // Award 30 points
    const { data: profile } = await supabase.schema('midas').from('profiles')
      .select('purama_points, purama_points_lifetime').eq('id', user.id).single();

    const newBalance = (profile?.purama_points ?? 0) + 30;
    await supabase.schema('midas').from('profiles').update({
      purama_points: newBalance,
      purama_points_lifetime: (profile?.purama_points_lifetime ?? 0) + 30,
    }).eq('id', user.id);

    await supabase.schema('midas').from('point_transactions').insert({
      user_id: user.id, amount: 30, type: 'earn', source: 'breathing',
      description: `Session respiration ${parsed.data.technique}`,
    });

    return NextResponse.json({ session, points_earned: 30, balance: newBalance });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
