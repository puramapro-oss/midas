import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const bodySchema = z.object({
  referralCode: z.string().min(1).max(50),
  referredUserId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { referralCode, referredUserId } = parsed.data;

    // Look up the referral code
    const { data: codeRecord, error: codeError } = await adminDb
      .from('referral_codes')
      .select('id, user_id, code, is_active, total_uses')
      .eq('code', referralCode)
      .eq('is_active', true)
      .single();

    if (codeError || !codeRecord) {
      return NextResponse.json({ error: 'Code de parrainage invalide ou inactif' }, { status: 404 });
    }

    // Prevent self-referral
    if (codeRecord.user_id === referredUserId) {
      return NextResponse.json({ error: 'Auto-parrainage interdit' }, { status: 400 });
    }

    // Check if referred user already has a referral
    const { data: existingReferral } = await adminDb
      .from('referrals')
      .select('id')
      .eq('referred_id', referredUserId)
      .single();

    if (existingReferral) {
      return NextResponse.json({ error: 'Cet utilisateur a deja ete parraine' }, { status: 409 });
    }

    // Create referral record
    const { data: referral, error: referralError } = await adminDb
      .from('referrals')
      .insert({
        referrer_id: codeRecord.user_id,
        referred_id: referredUserId,
        referral_code_id: codeRecord.id,
        status: 'pending',
        first_payment_processed: false,
      })
      .select('id, status')
      .single();

    if (referralError) {
      return NextResponse.json({ error: 'Erreur creation referral', details: referralError.message }, { status: 500 });
    }

    // Update referred_by on the referred user's profile
    await adminDb
      .from('profiles')
      .update({ referred_by: codeRecord.user_id })
      .eq('id', referredUserId);

    // Increment total_uses on the referral code
    await adminDb
      .from('referral_codes')
      .update({ total_uses: (codeRecord.total_uses ?? 0) + 1 })
      .eq('id', codeRecord.id);

    return NextResponse.json({ success: true, referralId: referral?.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
