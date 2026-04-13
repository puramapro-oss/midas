import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  category: z.string().optional(),
});

// POST: submit feedback (+200 points)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    // Check if already submitted recently (max 1/90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const { count } = await supabase.schema('midas').from('user_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', ninetyDaysAgo);

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'Tu as déjà donné ton avis récemment. Reviens dans 90 jours !' }, { status: 400 });
    }

    const POINTS_REWARD = 200;

    await supabase.schema('midas').from('user_feedback').insert({
      user_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      category: parsed.data.category ?? null,
      points_given: POINTS_REWARD,
    });

    // Award points
    const { data: profile } = await supabase.schema('midas').from('profiles')
      .select('purama_points, purama_points_lifetime').eq('id', user.id).single();

    await supabase.schema('midas').from('profiles').update({
      purama_points: (profile?.purama_points ?? 0) + POINTS_REWARD,
      purama_points_lifetime: (profile?.purama_points_lifetime ?? 0) + POINTS_REWARD,
    }).eq('id', user.id);

    await supabase.schema('midas').from('point_transactions').insert({
      user_id: user.id, amount: POINTS_REWARD, type: 'earn',
      source: 'feedback', description: 'Feedback soumis',
    });

    return NextResponse.json({ points_earned: POINTS_REWARD, message: 'Merci pour ton retour !' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
