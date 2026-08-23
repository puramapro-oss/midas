/**
 * CRON — Suppression effective des comptes (RGPD art. 17). Quotidien, 03:00 UTC.
 *
 * Lit `account_deletion_requests` (schéma `midas`) dont `scheduled_for` ≤ now() et
 * `status='scheduled'`. Pour chaque ligne : marque 'executing' → `auth.admin.deleteUser`
 * (purge auth.users + CASCADE sur toutes les tables FK, y compris `legal_acceptances`/
 * `cookie_consents`/`account_deletion_requests` elles-mêmes, `public.profiles` et
 * `midas.profiles`) → marque 'completed'. Échec → reste 'executing', pas de retry
 * automatique (investigation manuelle), ne renvoie JAMAIS {success:true} sans DELETE réel.
 *
 * Pattern identique à `arogya/src/app/api/cron/account-deletion/route.ts`.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/cron-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getLegalServiceClient } from '@/lib/legal/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DeletionRow {
  id: string;
  user_id: string;
  scheduled_for: string;
}

export async function GET(request: NextRequest) {
  return run(request);
}
export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const service = getLegalServiceClient();
  const auth = createServiceClient();
  const startedAt = Date.now();
  const now = new Date().toISOString();

  const { data: requests, error: rErr } = await service
    .from('account_deletion_requests')
    .select('id, user_id, scheduled_for')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .limit(100);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const list = (requests ?? []) as DeletionRow[];
  if (list.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, note: 'no deletion request due' });
  }

  const results: Array<{ id: string; user_id: string; ok: boolean; error?: string }> = [];

  for (const req of list) {
    await service.from('account_deletion_requests').update({ status: 'executing' }).eq('id', req.id);

    try {
      const { error: authErr } = await auth.auth.admin.deleteUser(req.user_id);
      if (authErr) throw authErr;

      await service
        .from('account_deletion_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', req.id);

      results.push({ id: req.id, user_id: req.user_id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: req.id, user_id: req.user_id, ok: false, error: message });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    runMs: Date.now() - startedAt,
  });
}
