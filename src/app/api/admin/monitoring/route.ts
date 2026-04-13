import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { SUPER_ADMIN_EMAIL } from '@/lib/utils/constants';

function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } }
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
  return { user };
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

    // Health checks (last 20)
    const { data: healthChecks } = await adminDb
      .from('health_checks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Incident log (last 20)
    const { data: incidents } = await adminDb
      .from('incident_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Uptime stats: count successful vs total health checks in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: totalChecks } = await adminDb
      .from('health_checks')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo);

    const { count: successfulChecks } = await adminDb
      .from('health_checks')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo)
      .eq('status', 'ok');

    const total = totalChecks ?? 0;
    const successful = successfulChecks ?? 0;
    const uptimePercent = total > 0 ? Math.round((successful / total) * 10000) / 100 : 100;

    // Critical incidents in last 24h
    const { count: criticalCount } = await adminDb
      .from('incident_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo)
      .eq('severity', 'critical');

    return NextResponse.json({
      health_checks: healthChecks ?? [],
      incidents: incidents ?? [],
      uptime: {
        percent: uptimePercent,
        total_checks_24h: total,
        successful_checks_24h: successful,
        critical_incidents_24h: criticalCount ?? 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
