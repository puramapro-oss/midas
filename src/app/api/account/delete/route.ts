/**
 * POST /api/account/delete   — programme la suppression du compte dans 30 jours (RGPD art. 17).
 * DELETE /api/account/delete — annule une demande de suppression en cours (période de grâce).
 *
 * Pattern identique à `arogya/src/app/api/account/delete/route.ts` (implémentation réelle
 * déjà en production dans l'écosystème Purama, réutilisée telle quelle).
 *
 * Pas de `checkRateLimit` ici : la signature MIDAS (`checkRateLimit(userId, plan)`, quota
 * par plan d'abonnement) ne correspond pas au rate-limit par clé libre attendu par ce bloc
 * — non bloquant pour la conformité RGPD (protection anti-abus additionnelle uniquement,
 * cf packages/legal/README.md).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getLegalServiceClient } from '@/lib/legal/db';

const GRACE_PERIOD_DAYS = 30;

const requestSchema = z.object({
  reason: z.string().max(500).optional(),
  confirm: z.literal('DELETE_MY_ACCOUNT'),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmation invalide. Tape 'DELETE_MY_ACCOUNT' pour confirmer." }, { status: 400 });
  }

  const scheduledFor = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 3600 * 1000);
  const legalDb = getLegalServiceClient();

  const { error } = await legalDb.from('account_deletion_requests').upsert(
    {
      user_id: user.id,
      scheduled_for: scheduledFor.toISOString(),
      reason: parsed.data.reason ?? null,
      status: 'scheduled',
      cancelled_at: null,
      completed_at: null,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return NextResponse.json({ error: 'Demande impossible.', debug: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scheduled_for: scheduledFor.toISOString(), grace_period_days: GRACE_PERIOD_DAYS });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });

  const legalDb = getLegalServiceClient();
  const { error } = await legalDb
    .from('account_deletion_requests')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'scheduled');

  if (error) {
    return NextResponse.json({ error: 'Annulation impossible.', debug: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
