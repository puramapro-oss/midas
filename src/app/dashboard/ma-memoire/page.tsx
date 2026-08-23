import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLegalServiceClient } from '@/lib/legal/db';
import MaMemoirePage, { type LegalAcceptanceRow } from '@/lib/legal/components/MaMemoirePage';

export const metadata: Metadata = {
  title: 'Ma mémoire — MIDAS',
  description: 'Consultez, exportez ou effacez vos données personnelles MIDAS.',
};

export const dynamic = 'force-dynamic';

export default async function DashboardMaMemoirePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/ma-memoire');

  const legalDb = getLegalServiceClient();
  const [{ data: acceptancesRaw }, { data: deletionRequest }] = await Promise.all([
    legalDb.from('legal_acceptances').select('doc_type, version, accepted_at').eq('user_id', user.id),
    legalDb
      .from('account_deletion_requests')
      .select('scheduled_for, status')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .maybeSingle(),
  ]);

  const acceptations: LegalAcceptanceRow[] = (acceptancesRaw ?? []).map((a) => ({
    docType: a.doc_type,
    version: a.version,
    acceptedAt: a.accepted_at,
  }));

  return (
    <MaMemoirePage
      appName="MIDAS"
      acceptations={acceptations}
      deletionScheduledFor={deletionRequest?.scheduled_for ?? null}
    />
  );
}
