// API POST /api/entraide/missions/[id]/actions — transitions d'état mission
// Actions: join, leave, start, complete, cancel (MOULE-ENTRAIDE.md §3)

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  joinMission,
  leaveMission,
  startMission,
  completeMission,
  cancelMission,
  type MissionCollective,
} from '@purama/entraide';
import { z } from 'zod';
import { persistMissionCollective } from '@/lib/entraide';

const actionSchema = z.object({
  action: z.enum(['join', 'leave', 'start', 'complete', 'cancel']),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const { action } = actionSchema.parse(body);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Charger mission actuelle
    const { data: missionData, error: missionError } = await supabase
      .from('midas.missions_collectives')
      .select('id, organizer_id, min_participants, max_participants, status')
      .eq('id', id)
      .single();

    if (missionError || !missionData) {
      return NextResponse.json(
        { error: 'Mission introuvable' },
        { status: 404 }
      );
    }

    // 2. Charger participants
    const { data: participants } = await supabase
      .from('midas.missions_collectives_participants')
      .select('user_id')
      .eq('mission_id', id);

    // Reconstituer MissionCollective (format lib)
    const currentMission: MissionCollective = {
      id: missionData.id,
      minParticipants: missionData.min_participants,
      maxParticipants: missionData.max_participants,
      participantIds: (participants || []).map((p) => p.user_id),
      status: missionData.status as any,
    };

    // 2. Appliquer action (fonction pure)
    let result;
    switch (action) {
      case 'join':
        result = joinMission(currentMission, user.id);
        break;
      case 'leave':
        result = leaveMission(currentMission, user.id);
        break;
      case 'start':
        // Seul l'organisateur peut démarrer
        if (missionData.organizer_id !== user.id) {
          return NextResponse.json(
            { error: 'Seul l\'organisateur peut démarrer la mission' },
            { status: 403 }
          );
        }
        result = startMission(currentMission);
        break;
      case 'complete':
        // Seul l'organisateur peut terminer
        if (missionData.organizer_id !== user.id) {
          return NextResponse.json(
            { error: 'Seul l\'organisateur peut terminer la mission' },
            { status: 403 }
          );
        }
        result = completeMission(currentMission);
        break;
      case 'cancel':
        // Seul l'organisateur peut annuler
        if (missionData.organizer_id !== user.id) {
          return NextResponse.json(
            { error: 'Seul l\'organisateur peut annuler la mission' },
            { status: 403 }
          );
        }
        result = cancelMission(currentMission);
        break;
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // 3. Persister nouvel état
    await persistMissionCollective(supabase, result.mission);

    return NextResponse.json({ mission: result.mission });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[POST /api/entraide/missions/[id]/actions]', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'action sur la mission' },
      { status: 500 }
    );
  }
}
