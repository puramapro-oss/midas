import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { SUPER_ADMIN_EMAIL } from '@/lib/utils/constants';
import { z } from 'zod';

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

const AddFundingSchema = z.object({
  pool_type: z.enum(['reward', 'asso', 'partner']),
  amount: z.number().positive('Le montant doit etre positif'),
  reason: z.string().min(1, 'La raison est requise').max(500),
  source_name: z.string().min(1, 'La source est requise').max(200),
});

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

    const { data: poolBalances } = await adminDb
      .from('pool_balances')
      .select('*')
      .order('pool_type', { ascending: true });

    const { data: poolTransactions } = await adminDb
      .from('pool_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      pool_balances: poolBalances ?? [],
      pool_transactions: poolTransactions ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }
    if (user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = AddFundingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e: { message: string }) => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { pool_type, amount, reason, source_name } = parsed.data;
    const adminDb = getAdminDb();

    // Insert pool transaction
    const { error: txError } = await adminDb
      .from('pool_transactions')
      .insert({
        pool_type,
        amount,
        direction: 'in',
        reason,
        source_name,
      });

    if (txError) {
      return NextResponse.json({ error: `Erreur insertion transaction: ${txError.message}` }, { status: 500 });
    }

    // Update pool balance: increment balance and total_in
    // First get current balance
    const { data: currentPool } = await adminDb
      .from('pool_balances')
      .select('*')
      .eq('pool_type', pool_type)
      .single();

    if (currentPool) {
      const { error: updateError } = await adminDb
        .from('pool_balances')
        .update({
          balance: (currentPool.balance ?? 0) + amount,
          total_in: (currentPool.total_in ?? 0) + amount,
        })
        .eq('pool_type', pool_type);

      if (updateError) {
        return NextResponse.json({ error: `Erreur mise a jour solde: ${updateError.message}` }, { status: 500 });
      }
    } else {
      // Create pool balance if it doesn't exist
      const { error: insertError } = await adminDb
        .from('pool_balances')
        .insert({
          pool_type,
          balance: amount,
          total_in: amount,
          total_out: 0,
        });

      if (insertError) {
        return NextResponse.json({ error: `Erreur creation pool: ${insertError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
