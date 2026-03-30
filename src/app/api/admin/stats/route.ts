import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { SUPER_ADMIN_EMAIL } from '@/lib/utils/constants';

function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

export async function GET() {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    if (user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const adminDb = getAdminDb();

    // Count profiles by plan
    const { count: totalUsers } = await adminDb
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const { count: freeUsers } = await adminDb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('plan', 'free');

    const { count: proUsers } = await adminDb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('plan', 'pro');

    const { count: ultraUsers } = await adminDb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('plan', 'ultra');

    // Trades today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: tradesToday } = await adminDb
      .from('trades')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    // Active bots
    const { count: activeBots } = await adminDb
      .from('bots')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    // Active subscriptions
    const { count: activeSubscriptions } = await adminDb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_status', 'active');

    // MRR estimate (pro: 29.99, ultra: 79.99 -- monthly equivalents)
    const proMonthly = (proUsers ?? 0) * 29.99;
    const ultraMonthly = (ultraUsers ?? 0) * 79.99;
    const estimatedMRR = Math.round((proMonthly + ultraMonthly) * 100) / 100;

    const stats = {
      totalUsers: totalUsers ?? 0,
      usersByPlan: {
        free: freeUsers ?? 0,
        pro: proUsers ?? 0,
        ultra: ultraUsers ?? 0,
      },
      tradesToday: tradesToday ?? 0,
      activeBots: activeBots ?? 0,
      activeSubscriptions: activeSubscriptions ?? 0,
      estimatedMRR,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
