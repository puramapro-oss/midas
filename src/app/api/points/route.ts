import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: balance + recent transactions
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const [profileRes, txRes] = await Promise.all([
      supabase.schema('midas').from('profiles').select('purama_points, purama_points_lifetime, streak_multiplier').eq('id', user.id).single(),
      supabase.schema('midas').from('point_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);

    return NextResponse.json({
      balance: profileRes.data?.purama_points ?? 0,
      lifetime: profileRes.data?.purama_points_lifetime ?? 0,
      multiplier: profileRes.data?.streak_multiplier ?? 1,
      transactions: txRes.data ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const earnSchema = z.object({
  amount: z.number().int().positive(),
  source: z.string().min(1),
  description: z.string().optional(),
  reference_id: z.string().uuid().optional(),
});

// POST: earn or spend points
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const parsed = earnSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 });

    const { amount, source, description, reference_id } = parsed.data;
    const type = body.type === 'spend' ? 'spend' : 'earn';

    if (type === 'spend') {
      const { data: profile } = await supabase.schema('midas').from('profiles').select('purama_points').eq('id', user.id).single();
      if (!profile || profile.purama_points < amount) {
        return NextResponse.json({ error: 'Points insuffisants' }, { status: 400 });
      }
    }

    // Insert transaction
    await supabase.schema('midas').from('point_transactions').insert({
      user_id: user.id,
      amount: type === 'spend' ? -amount : amount,
      type,
      source,
      description: description ?? null,
      reference_id: reference_id ?? null,
    });

    // Update balance
    const delta = type === 'spend' ? -amount : amount;
    if (type === 'earn') {
      await supabase.schema('midas').rpc('increment_points', { uid: user.id, pts: amount });
    } else {
      await supabase.schema('midas').from('profiles')
        .update({ purama_points: supabase.schema('midas').from('profiles').select('purama_points').eq('id', user.id) as unknown as number })
        .eq('id', user.id);
    }

    // Simple fallback: direct update
    const { data: current } = await supabase.schema('midas').from('profiles').select('purama_points, purama_points_lifetime').eq('id', user.id).single();
    const newBalance = Math.max(0, (current?.purama_points ?? 0) + delta);
    const newLifetime = type === 'earn' ? (current?.purama_points_lifetime ?? 0) + amount : (current?.purama_points_lifetime ?? 0);

    await supabase.schema('midas').from('profiles').update({
      purama_points: newBalance,
      purama_points_lifetime: newLifetime,
    }).eq('id', user.id);

    return NextResponse.json({ balance: newBalance, lifetime: newLifetime });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
