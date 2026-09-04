// API GET /api/entraide/matches — suggestions de mise en relation (cercle de traders)
// Lecture directe depuis midas.entraide_profils, scoring via computeMatchScore

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeMatchScore } from '@purama/entraide';
import { getMutualAidProfile } from '@/lib/entraide';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 1. Profil du demandeur
    const myProfile = await getMutualAidProfile(supabase, user.id);
    if (!myProfile) {
      return NextResponse.json(
        { error: 'Profil entraide non créé' },
        { status: 404 }
      );
    }

    // 2. Tous les autres profils (hors self)
    const { data: allProfiles, error: profilesError } = await supabase
      .from('midas.entraide_profils')
      .select('user_id')
      .neq('user_id', user.id);

    if (profilesError) throw profilesError;

    // 3. Calcul score pour chaque candidat
    const matches = await Promise.all(
      (allProfiles || []).map(async (p) => {
        const candidateProfile = await getMutualAidProfile(supabase, p.user_id);
        if (!candidateProfile) return null;

        const { score, reasons } = computeMatchScore(myProfile, candidateProfile);
        if (score === 0) return null; // Exclusion (bloqué ou no_skill_match)

        // Le nom public suffit pour l'affichage. L'email ne doit jamais transiter
        // dans la réponse de matching avant une acceptation explicite.
        const { data: userMeta } = await supabase
          .from('public.profiles')
          .select('full_name')
          .eq('user_id', p.user_id)
          .maybeSingle();

        return {
          userId: p.user_id,
          fullName: userMeta?.full_name || 'Trader anonyme',
          score,
          reasons,
          skillsOffered: candidateProfile.skillsOffered,
          availabilityDays: candidateProfile.availabilityDays,
        };
      })
    );

    // 4. Filtrer nulls + trier par score desc
    const validMatches = matches.filter((m) => m !== null);
    validMatches.sort((a, b) => b!.score - a!.score);

    return NextResponse.json({ matches: validMatches });
  } catch (error) {
    console.error('[GET /api/entraide/matches]', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul des suggestions' },
      { status: 500 }
    );
  }
}
