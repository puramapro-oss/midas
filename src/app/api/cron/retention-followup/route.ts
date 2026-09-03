import { type NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/cron-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { isJ30SameOfferWindow } from '@purama/retention';
import { sendRetentionJ7Email, sendRetentionJ30Email } from '@/lib/notifications/email';

// J+7/J+30 après résiliation (RETENTION-BRIEF.md §2) — la date de résiliation est
// le dernier événement retention_events(step='feedback', action='accepted') du user,
// pas de colonne dupliquée (D-MI01 : pas de table subscriptions fiable). Idempotent :
// 1 fenêtre de 24h par jour cible, pas de rejeu.
export async function GET(request: NextRequest) {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const service = createServiceClient();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  async function findCancellationsOn(daysAgo: number) {
    const from = new Date(now - (daysAgo + 1) * dayMs).toISOString();
    const to = new Date(now - daysAgo * dayMs).toISOString();
    const { data } = await service
      .schema('midas')
      .from('retention_events')
      .select('user_id, created_at')
      .eq('step', 'feedback')
      .eq('action', 'accepted')
      .gte('created_at', from)
      .lt('created_at', to);
    return data ?? [];
  }

  const [j7, j30] = await Promise.all([findCancellationsOn(7), findCancellationsOn(30)]);

  let sentJ7 = 0;
  let sentJ30 = 0;

  for (const row of j7) {
    const { data } = await service.auth.admin.getUserById(row.user_id);
    if (!data.user?.email) continue;
    await sendRetentionJ7Email(data.user.email);
    sentJ7++;
  }

  for (const row of j30) {
    const { data: userData } = await service.auth.admin.getUserById(row.user_id);
    if (!userData.user?.email) continue;
    const { data: offerRow } = await service
      .schema('midas')
      .from('promo_codes_log')
      .select('applied_at')
      .eq('user_id', row.user_id)
      .eq('code', 'SAVE50')
      .maybeSingle();
    const offerUsedAt = offerRow?.applied_at ? new Date(offerRow.applied_at) : null;
    await sendRetentionJ30Email(userData.user.email, isJ30SameOfferWindow(offerUsedAt));
    sentJ30++;
  }

  return NextResponse.json({ ok: true, sentJ7, sentJ30 });
}
