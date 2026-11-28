import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const privateHeaders = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && (authError.status ?? 0) >= 500) {
      return NextResponse.json({ error: 'Authentification temporairement indisponible.' }, { status: 503, headers: privateHeaders });
    }
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: privateHeaders });
    }

    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !Array.isArray(signals)) {
      return NextResponse.json({ error: 'Impossible de charger les signaux.' }, { status: 500, headers: privateHeaders });
    }

    return NextResponse.json({ signals }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Impossible de charger les signaux.' }, { status: 500, headers: privateHeaders });
  }
}
