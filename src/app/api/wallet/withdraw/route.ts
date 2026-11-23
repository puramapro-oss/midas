import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { isWithdrawalAvailable } from '@/lib/phase';
import { isValidIban, normalizeIban } from '@/lib/iban';
import { readWalletWithdrawalReceipt, readWalletWithdrawalRejection } from '@/lib/wallet-withdrawal';

const withdrawSchema = z.object({
  idempotencyKey: z.string().uuid().transform(value => value.toLowerCase()),
  expectedUserId: z.string().uuid().transform(value => value.toLowerCase()),
  amount: z.number().finite().min(5).max(9_999_999_999.99)
    .refine(value => Math.round(value * 100) / 100 === value, 'Deux décimales maximum').optional(),
  iban: z.string().transform(normalizeIban).refine(isValidIban, 'IBAN invalide').optional(),
}).refine(value => (value.amount === undefined) === (value.iban === undefined), 'Montant et IBAN requis ensemble');

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'midas' },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component — safe to ignore */ }
        },
      },
    }
  );
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } }
  );
}

export async function POST(request: NextRequest) {
  if (!isWithdrawalAvailable()) {
    return NextResponse.json({ error: 'Les retraits monétaires ne sont pas activés.', code: 'PHASE_1_LOCKED' }, { status: 403 });
  }
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let input: z.infer<typeof withdrawSchema>;
    try { input = withdrawSchema.parse(await request.json()); }
    catch { return NextResponse.json({ error: 'Montant, IBAN ou identifiant de demande invalide.', code: 'withdrawal_invalid_request' }, { status: 400 }); }
    if (input.expectedUserId !== user.id) {
      return NextResponse.json({ error: 'Le compte connecté a changé. Recharge ton wallet.', code: 'withdrawal_account_changed' }, { status: 409 });
    }
    const { data, error } = await getServiceClient().rpc('admit_wallet_withdrawal', {
      p_user_id: user.id, p_request_id: input.idempotencyKey, p_amount: input.amount ?? null, p_iban: input.iban ?? null,
    });
    if (error) {
      const code = error.message ?? '';
      if (code.includes('withdrawal_request_not_found')) {
        return NextResponse.json({ error: 'Cette demande n’est pas encore enregistrée. Tu peux la vérifier à nouveau ou ressaisir son IBAN original.', code: 'withdrawal_request_not_found' }, { status: 409 });
      }
      if (code.includes('withdrawal_idempotency_conflict')) {
        return NextResponse.json({ error: 'Cette demande correspond déjà à un autre montant ou destinataire.', code: 'withdrawal_idempotency_conflict' }, { status: 409 });
      }
      if (code.includes('withdrawal_locked_30d')) {
        return NextResponse.json({ error: 'Le délai de 30 jours après souscription n’est pas terminé.', code: 'withdrawal_locked_30d' }, { status: 403 });
      }
      if (code.includes('withdrawal_pending') || code.includes('insufficient_balance')) {
        return NextResponse.json({ error: code.includes('withdrawal_pending') ? 'Une demande de retrait est déjà en cours.' : 'Solde insuffisant.', code: code.includes('withdrawal_pending') ? 'withdrawal_pending' : 'insufficient_balance' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Le résultat de cette demande reste à confirmer. Conserve son identifiant.', code: 'withdrawal_reconciliation_required' }, { status: 409 });
    }
    try {
      const rejection = readWalletWithdrawalRejection(data, {
        userId: user.id, requestId: input.idempotencyKey, amount: input.amount, iban: input.iban,
      });
      if (rejection) return NextResponse.json(rejection, {
        status: rejection.code === 'withdrawal_locked_30d' ? 403 : rejection.code === 'insufficient_balance' ? 400 : 409,
      });
      return NextResponse.json(readWalletWithdrawalReceipt(data, {
        userId: user.id, requestId: input.idempotencyKey, amount: input.amount, iban: input.iban,
      }));
    } catch {
      return NextResponse.json({ error: 'Le reçu de cette demande reste à confirmer.', code: 'withdrawal_reconciliation_required' }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: 'Le service de retrait est indisponible.' }, { status: 503 });
  }
}
