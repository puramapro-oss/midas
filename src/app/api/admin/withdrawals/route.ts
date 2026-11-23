import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { isWithdrawalAvailable } from '@/lib/phase';

const SUPER_ADMIN_EMAIL = 'matiss.frasne@gmail.com';

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
          } catch { /* Server Component */ }
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

async function checkAdmin(supabase: Awaited<ReturnType<typeof getAuthClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (user.email !== SUPER_ADMIN_EMAIL) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'super_admin') return null;
  return user;
}

export async function GET() {
  try {
    const supabase = await getAuthClient();
    const admin = await checkAdmin(supabase);
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const service = getServiceClient();

    // All withdrawal requests with user info
    const { data: withdrawals, error: withdrawalsError } = await service
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (withdrawalsError) return NextResponse.json({ error: 'Lecture des retraits indisponible.' }, { status: 503 });

    // Enrich with user email/name
    const enriched = [];
    for (const w of withdrawals ?? []) {
      const { data: profile } = await service
        .from('profiles')
        .select('email, full_name')
        .eq('id', w.user_id)
        .single();
      enriched.push({
        ...w,
        user_email: profile?.email ?? 'Inconnu',
        user_name: profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Inconnu',
      });
    }

    return NextResponse.json({ withdrawals: enriched });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isWithdrawalAvailable()) {
    return NextResponse.json({ error: 'Les retraits monétaires ne sont pas activés.', code: 'PHASE_1_LOCKED' }, { status: 403 });
  }
  try {
    const supabase = await getAuthClient();
    const admin = await checkAdmin(supabase);
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    let input: { id: string; action: 'processed' | 'rejected'; note?: string | null };
    try {
      input = z.object({ id: z.string().uuid().transform(value => value.toLowerCase()), action: z.enum(['processed','rejected']), note: z.string().max(2000).nullable().optional() }).parse(await request.json());
    } catch {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    const { id, action, note } = input;
    const service = getServiceClient();
    // This client uses schema midas; the transaction is deliberately defined in
    // that schema, and operates only on the legacy IBAN wallet.
    const { data, error } = await service.rpc('decide_wallet_withdrawal', {
      p_admin_user_id: admin.id, p_withdrawal_id: id, p_action: action, p_note: note ?? null,
    });
    if (error) {
      const message = error.message ?? '';
      if (message.includes('withdrawal_not_found')) return NextResponse.json({ error: 'Retrait introuvable.' }, { status: 404 });
      if (/withdrawal_(debit_proof_required|reconciliation_required|decision_conflict|not_admitted)/.test(message)) {
        return NextResponse.json({ error: 'Ce retrait nécessite une réconciliation de son débit ou de sa décision.', code: 'withdrawal_reconciliation_required' }, { status: 409 });
      }
      return NextResponse.json({ error: 'La décision de retrait n’est pas confirmée.' }, { status: 503 });
    }
    const balance = data?.wallet_balance;
    if (!data || data.id !== id || data.status !== action || typeof data.applied !== 'boolean' ||
        data.debit_confirmed !== true || data.rejection_recorded !== false || data.admission_rejection !== null ||
        data.refunded !== (action === 'rejected') ||
        (typeof balance !== 'number' && (typeof balance !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(balance))) ||
        !Number.isFinite(Number(balance)) || Number(balance) < 0 ||
        Math.round(Number(balance) * 100) / 100 !== Number(balance)) {
      return NextResponse.json({ error: 'Le reçu de décision est invalide.' }, { status: 503 });
    }
    return NextResponse.json({ ok: true, withdrawal_id: id, status: data.status, replayed: !data.applied });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
