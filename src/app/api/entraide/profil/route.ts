// API /api/entraide/profil — CRUD profil entraide personnel (GET : lit son propre profil, PUT : upsert)
// Sans profil créé, les matches seront toujours vides (0 traders compatibles) → bug bloquant corrigé

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProfileSchema = z.object({
  skillsOffered: z.array(z.string()).max(10),
  skillsNeeded: z.array(z.string()).max(10),
  availabilityDays: z.array(z.enum(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])).max(7),
  radiusKm: z.number().int().min(5).max(500),
  locationLat: z.number().min(-90).max(90).nullable(),
  locationLng: z.number().min(-180).max(180).nullable(),
});

export async function GET() {
  try {
    const supabase = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Lire profil depuis midas.entraide_profils (scoped à auth.uid())
    const { data: profile, error } = await supabase
      .from('midas.entraide_profils')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    // Si pas de profil, retourner null (client affichera formulaire vierge)
    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: {
        skillsOffered: profile.skills_offered || [],
        skillsNeeded: profile.skills_needed || [],
        availabilityDays: profile.availability_days || [],
        radiusKm: profile.radius_km,
        locationLat: profile.location_lat,
        locationLng: profile.location_lng,
      },
    });
  } catch (error) {
    console.error('[GET /api/entraide/profil]', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement du profil' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const validated = updateProfileSchema.parse(body);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Upsert profil (INSERT si pas de profil, UPDATE sinon)
    const { error: upsertError } = await supabase
      .from('midas.entraide_profils')
      .upsert(
        {
          user_id: user.id,
          skills_offered: validated.skillsOffered,
          skills_needed: validated.skillsNeeded,
          availability_days: validated.availabilityDays,
          radius_km: validated.radiusKm,
          location_lat: validated.locationLat,
          location_lng: validated.locationLng,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[PUT /api/entraide/profil]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde du profil' },
      { status: 500 }
    );
  }
}
