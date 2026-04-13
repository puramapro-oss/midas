import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

function getAdminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const payoutSchema = z.object({
  amount: z.number().min(50).max(10000),
});

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const { data: partner } = await adminDb
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: 'Partenaire non trouve' }, { status: 404 });
    }

    const { data: payouts } = await adminDb
      .from('partner_payouts')
      .select('*')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ success: true, payouts: payouts ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = payoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Montant invalide (minimum 50 EUR)' }, { status: 400 });
    }

    const { amount } = parsed.data;
    const adminDb = getAdminDb();

    const { data: partner, error: partnerError } = await adminDb
      .from('partners')
      .select('id, current_balance, iban')
      .eq('user_id', user.id)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Partenaire non trouve' }, { status: 404 });
    }

    if (Number(partner.current_balance) < amount) {
      return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 });
    }

    if (!partner.iban) {
      return NextResponse.json({ error: 'IBAN requis pour les retraits. Ajoutez-le dans vos parametres.' }, { status: 400 });
    }

    // Check for pending payout
    const { data: pendingPayout } = await adminDb
      .from('partner_payouts')
      .select('id')
      .eq('partner_id', partner.id)
      .eq('status', 'pending')
      .single();

    if (pendingPayout) {
      return NextResponse.json({ error: 'Un retrait est deja en cours' }, { status: 409 });
    }

    // Create payout request
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: payout, error: payoutError } = await adminDb
      .from('partner_payouts')
      .insert({
        partner_id: partner.id,
        amount,
        currency: 'EUR',
        iban: partner.iban,
        reference,
        status: 'pending',
      })
      .select('*')
      .single();

    if (payoutError) {
      return NextResponse.json({ error: 'Erreur creation du retrait' }, { status: 500 });
    }

    // Deduct from balance
    await adminDb
      .from('partners')
      .update({ current_balance: Number(partner.current_balance) - amount })
      .eq('id', partner.id);

    return NextResponse.json({ success: true, payout }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
