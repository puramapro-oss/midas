import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SUPER_ADMIN_EMAIL } from '@/lib/utils/constants';

function getAdminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const bodySchema = z.object({
  referralId: z.string().uuid(),
});

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
  return { user, supabase };
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    // Admin only
    if (user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { referralId } = parsed.data;
    const adminDb = getAdminDb();

    // Fetch referral
    const { data: referral, error: fetchError } = await adminDb
      .from('referrals')
      .select('id, status, referrer_id, referred_id')
      .eq('id', referralId)
      .single();

    if (fetchError || !referral) {
      return NextResponse.json({ error: 'Referral introuvable' }, { status: 404 });
    }

    if (referral.status === 'rewarded') {
      return NextResponse.json({ error: 'Referral deja recompense' }, { status: 409 });
    }

    if (referral.status === 'cancelled') {
      return NextResponse.json({ error: 'Referral annule, impossible de recompenser' }, { status: 400 });
    }

    // Update referral status
    const { error: updateError } = await adminDb
      .from('referrals')
      .update({
        status: 'rewarded',
        first_payment_processed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referralId);

    if (updateError) {
      return NextResponse.json({ error: 'Erreur mise a jour referral', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
