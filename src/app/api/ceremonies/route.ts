import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: recent victory ceremonies
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const { data: ceremonies } = await supabase.schema('midas').from('victory_ceremonies')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({ ceremonies: ceremonies ?? [] });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
