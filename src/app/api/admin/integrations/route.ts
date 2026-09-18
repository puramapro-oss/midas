import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPER_ADMIN_EMAIL } from '@/lib/utils/constants';
import { getIntegrationConfiguration, KEYLESS_DATA_SOURCES } from '@/lib/integrations/registry';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
  if (user.email !== SUPER_ADMIN_EMAIL) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

  const integrations = getIntegrationConfiguration();
  return NextResponse.json({
    ready: integrations.every((item) => !item.required || item.configured),
    integrations,
    keyless_data_sources: KEYLESS_DATA_SOURCES,
    exchange_credentials: 'Configured per user through encrypted exchange connections; never exposed here.',
    unavailable_in_code: ['FundedNext', 'MetaApi / MetaTrader'],
  });
}
