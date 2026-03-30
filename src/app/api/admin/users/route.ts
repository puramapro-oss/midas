import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { SUPER_ADMIN_EMAIL } from '@/lib/utils/constants';

function getAdminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function GET(request: Request) {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    if (user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage = 20;
    const search = searchParams.get('search')?.trim() ?? '';
    const offset = (page - 1) * perPage;

    const adminDb = getAdminDb();
    let query = adminDb
      .from('profiles')
      .select('id, email, full_name, plan, role, tier, subscription_status, auto_trade_enabled, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (search.length > 0) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, count, error: usersError } = await query;

    if (usersError) {
      return NextResponse.json({ error: 'Erreur recuperation utilisateurs', details: usersError.message }, { status: 500 });
    }

    return NextResponse.json({
      users: users ?? [],
      total: count ?? 0,
      page,
      perPage,
      totalPages: Math.ceil((count ?? 0) / perPage),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
