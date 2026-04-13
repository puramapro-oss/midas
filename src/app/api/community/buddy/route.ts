import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: my buddy + checkins
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const { data: buddies } = await supabase.schema('midas').from('buddies')
      .select('*')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .eq('status', 'active')
      .limit(5);

    // Get buddy profiles
    const buddyData = [];
    for (const b of buddies ?? []) {
      const buddyId = b.user_a === user.id ? b.user_b : b.user_a;
      const { data: profile } = await supabase.schema('midas').from('profiles')
        .select('id, full_name, avatar_url, streak_days, level')
        .eq('id', buddyId).single();

      const { data: checkins } = await supabase.schema('midas').from('buddy_checkins')
        .select('*')
        .eq('buddy_pair_id', b.id)
        .order('created_at', { ascending: false })
        .limit(10);

      buddyData.push({ ...b, buddy_profile: profile, checkins: checkins ?? [] });
    }

    return NextResponse.json({ buddies: buddyData });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const checkinSchema = z.object({
  buddy_pair_id: z.string().uuid(),
  message: z.string().min(1).max(200),
  mood_emoji: z.string().max(4).optional(),
});

// POST: send checkin to buddy
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const body = await req.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Message requis' }, { status: 400 });

    // Verify user is part of this buddy pair
    const { data: buddy } = await supabase.schema('midas').from('buddies')
      .select('*')
      .eq('id', parsed.data.buddy_pair_id)
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .single();

    if (!buddy) return NextResponse.json({ error: 'Buddy introuvable' }, { status: 404 });

    const { data: checkin, error } = await supabase.schema('midas').from('buddy_checkins').insert({
      buddy_pair_id: parsed.data.buddy_pair_id,
      sender_id: user.id,
      message: parsed.data.message,
      mood_emoji: parsed.data.mood_emoji ?? null,
    }).select().single();

    if (error) return NextResponse.json({ error: 'Impossible d\'envoyer' }, { status: 500 });

    return NextResponse.json({ checkin });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
