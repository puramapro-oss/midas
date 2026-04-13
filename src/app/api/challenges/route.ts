import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: my challenges
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { data: challenges } = await supabase.schema('midas').from('challenges')
      .select('*')
      .or(`challenger_id.eq.${user.id},challenged_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ challenges: challenges ?? [] });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const challengeSchema = z.object({
  contact: z.string().min(1),
  type: z.string().min(1),
  target: z.number().int().positive(),
});

// POST: create a challenge
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const parsed = challengeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    const { data: challenge, error } = await supabase.schema('midas').from('challenges').insert({
      challenger_id: user.id,
      challenged_contact: parsed.data.contact,
      type: parsed.data.type,
      target: parsed.data.target,
    }).select().single();

    if (error) return NextResponse.json({ error: 'Impossible de créer le challenge' }, { status: 500 });
    return NextResponse.json({ challenge });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
