import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const profileSchema = z.object({
  type_profil: z.enum(['particulier', 'entreprise', 'association', 'etudiant']),
  situation: z.enum(['salarie', 'demandeur_emploi', 'independant', 'auto_entrepreneur', 'retraite', 'rsa', 'cej']),
  departement: z.string().min(1).max(5),
  handicap: z.boolean().default(false),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } }
  );
}

// GET — fetch all aides, optionally filtered by profile
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeProfil = searchParams.get('type_profil');
    const situation = searchParams.get('situation');
    const departement = searchParams.get('departement');
    const handicap = searchParams.get('handicap') === 'true';

    const supabase = getServiceClient();

    let query = supabase
      .from('aides')
      .select('*')
      .eq('active', true)
      .order('montant_max', { ascending: false });

    const { data: aides, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Erreur chargement des aides' }, { status: 500 });
    }

    // Client-side matching if profile params provided
    if (typeProfil && situation) {
      const matched = (aides ?? []).map((aide) => {
        const profilMatch = !aide.profil_eligible?.length || aide.profil_eligible.includes(typeProfil);
        const situationMatch = !aide.situation_eligible?.length || aide.situation_eligible.includes(situation);
        const regionMatch = !aide.region || aide.region === 'national' || aide.region === departement;
        const handicapMatch = !aide.handicap_only || handicap;

        let probability: 'probable' | 'possible' | 'verifier' = 'verifier';
        if (profilMatch && situationMatch && regionMatch && handicapMatch) {
          probability = 'probable';
        } else if (profilMatch && situationMatch) {
          probability = 'possible';
        }

        return { ...aide, probability, matches: profilMatch && situationMatch };
      });

      const sorted = matched
        .filter((a) => a.probability !== 'verifier' || a.matches)
        .sort((a, b) => {
          const order: Record<string, number> = { probable: 0, possible: 1, verifier: 2 };
          return (order[a.probability] ?? 2) - (order[b.probability] ?? 2) || (b.montant_max ?? 0) - (a.montant_max ?? 0);
        });

      const totalCumul = sorted
        .filter((a) => a.probability === 'probable')
        .reduce((sum, a) => sum + (a.montant_max ?? 0), 0);

      return NextResponse.json({ aides: sorted, totalCumul, count: sorted.length });
    }

    return NextResponse.json({ aides, count: aides?.length ?? 0 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — save user financement profile
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Save financement profile to profiles metadata
    const { error } = await supabase
      .from('profiles')
      .update({
        metadata: {
          financement_profil: parsed.data,
          financement_updated_at: new Date().toISOString(),
        },
      })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Erreur sauvegarde profil' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
