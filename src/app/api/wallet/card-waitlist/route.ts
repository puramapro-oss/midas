import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } },
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const svc = serviceClient();
  const { count } = await svc
    .from('card_waitlist')
    .select('*', { count: 'exact', head: true });

  const user = await getUser();
  let notified = false;
  if (user) {
    const { data } = await svc
      .from('card_waitlist')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    notified = !!data;
  }

  return NextResponse.json({ count: count ?? 0, notified });
}

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const svc = serviceClient();
  const { error } = await svc
    .from('card_waitlist')
    .upsert({ user_id: user.id, app_id: 'midas' }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
