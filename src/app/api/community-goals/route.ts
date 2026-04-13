import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: active community goals
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const { data: goals } = await supabase.schema('midas').from('community_goals')
      .select('*')
      .eq('achieved', false)
      .order('deadline', { ascending: true })
      .limit(5);

    return NextResponse.json({ goals: goals ?? [] });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
