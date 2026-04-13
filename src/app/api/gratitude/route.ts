import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: user's gratitude entries
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '30');

    const { data: entries } = await supabase.schema('midas').from('gratitude_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Streak: consecutive days with entries
    const { count: totalEntries } = await supabase.schema('midas').from('gratitude_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      entries: entries ?? [],
      total: totalEntries ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const gratitudeSchema = z.object({
  content: z.string().min(1).max(500),
  tagged_user_id: z.string().uuid().optional(),
});

// POST: add gratitude entry (+50 points, max 1/day)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const body = await req.json();
    const parsed = gratitudeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Contenu requis (max 500 caracteres)' }, { status: 400 });

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase.schema('midas').from('gratitude_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Maximum 3 gratitudes par jour' }, { status: 400 });
    }

    const { data: entry, error } = await supabase.schema('midas').from('gratitude_entries').insert({
      user_id: user.id,
      content: parsed.data.content,
      tagged_user_id: parsed.data.tagged_user_id ?? null,
    }).select().single();

    if (error) return NextResponse.json({ error: 'Impossible de sauvegarder' }, { status: 500 });

    // Award 50 points
    const { data: profile } = await supabase.schema('midas').from('profiles')
      .select('purama_points, purama_points_lifetime').eq('id', user.id).single();

    const newBalance = (profile?.purama_points ?? 0) + 50;
    await supabase.schema('midas').from('profiles').update({
      purama_points: newBalance,
      purama_points_lifetime: (profile?.purama_points_lifetime ?? 0) + 50,
    }).eq('id', user.id);

    await supabase.schema('midas').from('point_transactions').insert({
      user_id: user.id, amount: 50, type: 'earn', source: 'gratitude',
      description: 'Journal de gratitude',
    });

    return NextResponse.json({ entry, points_earned: 50, balance: newBalance });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
