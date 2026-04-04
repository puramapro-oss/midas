import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
    const { data: withdrawals } = await service
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

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
  try {
    const supabase = await getAuthClient();
    const admin = await checkAdmin(supabase);
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id, action, note } = await request.json();
    if (!id || !['processed', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }

    const service = getServiceClient();

    // Get withdrawal
    const { data: withdrawal } = await service
      .from('withdrawal_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (!withdrawal || withdrawal.status !== 'pending') {
      return NextResponse.json({ error: 'Retrait non trouvé ou déjà traité' }, { status: 404 });
    }

    // Update status
    await service
      .from('withdrawal_requests')
      .update({
        status: action,
        admin_note: note ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);

    // If rejected, refund wallet
    if (action === 'rejected') {
      const { data: wallet } = await service
        .from('wallets')
        .select('balance')
        .eq('user_id', withdrawal.user_id)
        .single();

      if (wallet) {
        await service
          .from('wallets')
          .update({ balance: Number(wallet.balance) + Number(withdrawal.amount) })
          .eq('user_id', withdrawal.user_id);
      }

      await service.from('wallet_transactions').insert({
        user_id: withdrawal.user_id,
        type: 'credit',
        amount: withdrawal.amount,
        source: 'manual',
        description: 'Retrait rejeté — remboursement',
        reference_id: id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
