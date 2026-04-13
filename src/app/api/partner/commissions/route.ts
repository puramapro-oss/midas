import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getAdminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const adminDb = getAdminDb();

    // Get partner
    const { data: partner } = await adminDb
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: 'Partenaire non trouve' }, { status: 404 });
    }

    const { data: commissions, error } = await adminDb
      .from('partner_commissions')
      .select('*')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: 'Erreur chargement commissions' }, { status: 500 });
    }

    return NextResponse.json({ success: true, commissions: commissions ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
