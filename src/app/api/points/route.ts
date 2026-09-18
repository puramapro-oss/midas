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

// POST: dépense de points uniquement (boutique, etc.).
// Sécurité : le « earn » n'est PLUS exposé côté client — tout user authentifié
// pouvait se créditer un montant arbitraire (audit 2026-09-18 H2). Les gains
// passent exclusivement par les routes serveur dédiées (daily-gift, gratitude,
// breathing, feedback, boutique…) qui créditent via le service client.
const spendSchema = z.object({
  amount: z.number().int().positive().max(100_000),
  source: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  reference_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const parsed = spendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides — cet endpoint ne gère que la dépense de points.' },
        { status: 400 },
      );
    }

    const { amount, source, description, reference_id } = parsed.data;

    const { data: profile } = await supabase.schema('midas').from('profiles')
      .select('purama_points, purama_points_lifetime')
      .eq('id', user.id)
      .single();
    if (!profile || (profile.purama_points ?? 0) < amount) {
      return NextResponse.json({ error: 'Points insuffisants' }, { status: 400 });
    }

    const { error: txError } = await supabase.schema('midas').from('point_transactions').insert({
      user_id: user.id,
      amount: -amount,
      type: 'spend',
      source,
      description: description ?? null,
      reference_id: reference_id ?? null,
    });
    if (txError) return NextResponse.json({ error: 'Transaction impossible' }, { status: 500 });

    const newBalance = (profile.purama_points ?? 0) - amount;
    await supabase.schema('midas').from('profiles')
      .update({ purama_points: newBalance })
      .eq('id', user.id);

    return NextResponse.json({ balance: newBalance, lifetime: profile.purama_points_lifetime ?? 0 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
