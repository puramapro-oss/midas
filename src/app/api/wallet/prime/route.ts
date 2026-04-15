import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { daysUntilWithdrawal } from '@/lib/phase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_started_at, prime_total_credited')
    .eq('id', user.id)
    .maybeSingle();

  const { data: tranches } = await supabase
    .from('prime_tranches')
    .select('palier, amount, scheduled_for, credited_at, status')
    .eq('user_id', user.id)
    .order('palier', { ascending: true });

  return NextResponse.json({
    tranches: tranches ?? [],
    subscription_started_at: profile?.subscription_started_at ?? null,
    total_credited: Number(profile?.prime_total_credited ?? 0),
    days_until_withdrawal: daysUntilWithdrawal(profile?.subscription_started_at ?? null),
  });
}
