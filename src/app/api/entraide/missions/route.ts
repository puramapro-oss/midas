// API /api/entraide/missions — CRUD missions collectives (binômes/groupes analyse marché)
// GET: liste missions ouvertes/prêtes | POST: créer mission

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createMissionCollective } from '@purama/entraide';
import { z } from 'zod';

const createMissionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000),
  minParticipants: z.number().int().min(2).max(10),
  maxParticipants: z.number().int().min(2).max(50).optional(),
});

export async function GET() {
  try {
    const supabase = await createServiceClient();

    // 1. Récupérer missions
    const { data: missions, error } = await supabase
      .from('midas.missions_collectives')
      .select('id, organizer_id, title, description, min_participants, max_participants, status, created_at')
      .in('status', ['ouverte', 'prete', 'en_cours'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. Récupérer participants pour chaque mission
    const missionIds = (missions || []).map((m) => m.id);
    let participants: Array<{ mission_id: string; user_id: string; joined_at: string }> = [];
    if (missionIds.length > 0) {
      const { data: participantsData } = await supabase
        .from('midas.missions_collectives_participants')
        .select('mission_id, user_id, joined_at')
        .in('mission_id', missionIds);
      participants = participantsData || [];
    }

    // 3. Associer participants aux missions
    const missionsWithParticipants = (missions || []).map((mission) => ({
      ...mission,
      missions_collectives_participants: participants.filter(
        (p) => p.mission_id === mission.id
      ),
    }));

    return NextResponse.json({ missions: missionsWithParticipants });
  } catch (error) {
    console.error('[GET /api/entraide/missions]', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des missions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const validated = createMissionSchema.parse(body);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 1. Créer via la lib (validation + état initial)
    const result = createMissionCollective({
      id: crypto.randomUUID(),
      organizerId: user.id,
      minParticipants: validated.minParticipants,
      maxParticipants: validated.maxParticipants,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // 2. Persister avec title/description (la lib ne connaît que la logique, pas les champs métier)
    const { error: insertError } = await supabase
      .from('midas.missions_collectives')
      .insert({
        id: result.mission.id,
        organizer_id: user.id,
        title: validated.title,
        description: validated.description,
        min_participants: result.mission.minParticipants,
        max_participants: result.mission.maxParticipants,
        status: result.mission.status,
      });

    if (insertError) throw insertError;

    // 3. Ajouter organisateur comme participant
    const { error: participantError } = await supabase
      .from('midas.missions_collectives_participants')
      .insert({
        mission_id: result.mission.id,
        user_id: user.id,
      });

    if (participantError) throw participantError;

    return NextResponse.json({ mission: result.mission }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[POST /api/entraide/missions]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la mission' },
      { status: 500 }
    );
  }
}
