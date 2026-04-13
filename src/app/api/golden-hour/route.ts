import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: check if golden hour is active + claim points
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const now = new Date();
    const { data: activeHour } = await supabase.schema('midas').from('golden_hours')
      .select('*')
      .lte('started_at', now.toISOString())
      .gte('ended_at', now.toISOString())
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: nextHour } = await supabase.schema('midas').from('golden_hours')
      .select('*')
      .gt('started_at', now.toISOString())
      .order('started_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      active: !!activeHour,
      golden_hour: activeHour ?? null,
      next_golden_hour: nextHour ?? null,
      multiplier: activeHour?.multiplier ?? 1,
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
