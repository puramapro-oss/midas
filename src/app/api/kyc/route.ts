import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

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

// GET — fetch user's KYC status
export async function GET() {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: kyc } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!kyc) {
      return NextResponse.json({
        kyc: { status: 'none', tier: 0, user_id: user.id },
      });
    }

    return NextResponse.json({ kyc });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const submitSchema = z.object({
  full_name: z.string().min(2, 'Nom complet requis (min 2 caractères)'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date: YYYY-MM-DD'),
  nationality: z.string().min(2, 'Nationalité requise'),
  address_line: z.string().min(5, 'Adresse requise'),
  city: z.string().min(2, 'Ville requise'),
  postal_code: z.string().min(4, 'Code postal requis'),
  country: z.string().default('FR'),
  document_type: z.enum(['passport', 'id_card', 'driver_license']),
});

// POST — submit KYC verification
export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
        { status: 400 }
      );
    }

    const d = parsed.data;

    // Check if already verified or pending
    const { data: existing } = await supabase
      .from('kyc_verifications')
      .select('status')
      .eq('user_id', user.id)
      .single();

    if (existing?.status === 'verified') {
      return NextResponse.json({ error: 'Déjà vérifié' }, { status: 400 });
    }
    if (existing?.status === 'pending') {
      return NextResponse.json({ error: 'Vérification déjà en cours. Merci de patienter.' }, { status: 400 });
    }

    // Upsert KYC record
    const { data: kyc, error } = await supabase
      .from('kyc_verifications')
      .upsert({
        user_id: user.id,
        status: 'pending',
        tier: 1,
        full_name: d.full_name,
        date_of_birth: d.date_of_birth,
        nationality: d.nationality,
        address_line: d.address_line,
        city: d.city,
        postal_code: d.postal_code,
        country: d.country,
        document_type: d.document_type,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la soumission. Réessaie.' }, { status: 500 });
    }

    // Log the submission
    await supabase.from('kyc_audit_logs').insert({
      user_id: user.id,
      action: 'kyc_submitted',
      details: { document_type: d.document_type, tier_requested: 2 },
    });

    return NextResponse.json({ kyc, message: 'Vérification soumise avec succès. Tu seras notifié du résultat.' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
