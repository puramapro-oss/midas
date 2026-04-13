import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: check if review prompt should show
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    // Check last prompt: max 1/90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { count } = await supabase.schema('midas').from('review_prompts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('shown_at', ninetyDaysAgo.toISOString());

    return NextResponse.json({
      should_show: (count ?? 0) === 0,
      last_shown: null,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const responseSchema = z.object({
  triggered_by: z.string().min(1),
  action: z.enum(['accepted', 'later', 'never']),
});

// POST: record review prompt response (+500 pts if accepted)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const body = await req.json();
    const parsed = responseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 });

    const pointsGiven = parsed.data.action === 'accepted' ? 500 : 0;

    await supabase.schema('midas').from('review_prompts').insert({
      user_id: user.id,
      triggered_by: parsed.data.triggered_by,
      response: parsed.data.action,
      points_given: pointsGiven,
    });

    if (pointsGiven > 0) {
      const { data: profile } = await supabase.schema('midas').from('profiles')
        .select('purama_points, purama_points_lifetime').eq('id', user.id).single();

      await supabase.schema('midas').from('profiles').update({
        purama_points: (profile?.purama_points ?? 0) + pointsGiven,
        purama_points_lifetime: (profile?.purama_points_lifetime ?? 0) + pointsGiven,
      }).eq('id', user.id);

      await supabase.schema('midas').from('point_transactions').insert({
        user_id: user.id, amount: pointsGiven, type: 'earn', source: 'review',
        description: 'Avis sur le store',
      });
    }

    return NextResponse.json({ points_earned: pointsGiven });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
