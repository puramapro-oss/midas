// Adapter @purama/entraide pour MIDAS (trading)
// Implémente l'interface MOULE-ENTRAIDE.md §1 contre schéma midas.entraide_*

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MutualAidProfile,
  MissionCollective,
  WeekDay,
} from '@purama/entraide';

// Schéma DB cible (CLAUDE.md §11 : 1 schéma PostgreSQL par app)
const SCHEMA = 'midas';

/** Construit MutualAidProfile depuis midas.entraide_profils + blocages */
export async function getMutualAidProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<MutualAidProfile | null> {
  const [profileRes, blockedRes] = await Promise.all([
    supabase
      .from(`${SCHEMA}.entraide_profils`)
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from(`${SCHEMA}.entraide_blocages`)
      .select('blocked_id')
      .eq('blocker_id', userId),
  ]);

  if (profileRes.error || !profileRes.data) return null;

  const p = profileRes.data;
  return {
    userId,
    skillsOffered: p.skills_offered || [],
    skillsNeeded: p.skills_needed || [],
    availabilityDays: (p.availability_days || []) as WeekDay[],
    radiusKm: p.radius_km,
    location:
      p.location_lat !== null && p.location_lng !== null
        ? { lat: p.location_lat, lng: p.location_lng }
        : null,
    blockedUserIds: (blockedRes.data || []).map((b) => b.blocked_id),
  };
}

/** Liste des users bloqués par userId */
export async function getBlockedUserIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from(`${SCHEMA}.entraide_blocages`)
    .select('blocked_id')
    .eq('blocker_id', userId);
  return (data || []).map((row) => row.blocked_id);
}

/** Sauvegarde l'état mission après transition (upsert complet) */
export async function persistMissionCollective(
  supabase: SupabaseClient,
  mission: MissionCollective
): Promise<void> {
  // 1. Upsert mission
  const { error: missionError } = await supabase
    .from(`${SCHEMA}.missions_collectives`)
    .upsert(
      {
        id: mission.id,
        organizer_id: mission.participantIds[0], // organisateur = 1er participant (convention lib)
        title: '', // sera fourni par l'UI lors de la création
        description: '',
        min_participants: mission.minParticipants,
        max_participants: mission.maxParticipants,
        status: mission.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (missionError) throw missionError;

  // 2. Remplacer participants (delete + insert atomique dans une transaction serait mieux,
  //    mais pour simplifier on fait delete all puis insert all — acceptable car service_role)
  await supabase
    .from(`${SCHEMA}.missions_collectives_participants`)
    .delete()
    .eq('mission_id', mission.id);

  if (mission.participantIds.length > 0) {
    const { error: participantsError } = await supabase
      .from(`${SCHEMA}.missions_collectives_participants`)
      .insert(
        mission.participantIds.map((userId) => ({
          mission_id: mission.id,
          user_id: userId,
          joined_at: new Date().toISOString(),
        }))
      );

    if (participantsError) throw participantsError;
  }
}

/** Compteur demandes contact envoyées aujourd'hui par userId */
export async function getContactRequestsSentToday(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const { count } = await supabase
    .from(`${SCHEMA}.entraide_contact_requests`)
    .select('*', { count: 'exact', head: true })
    .eq('requester_id', userId)
    .gte('created_at', today);
  return count || 0;
}

/** Détecte doublon : une demande pending entre requester→recipient */
export async function getPendingRequestToRecipient(
  supabase: SupabaseClient,
  requesterId: string,
  recipientId: string
): Promise<boolean> {
  const { data } = await supabase
    .from(`${SCHEMA}.entraide_contact_requests`)
    .select('id')
    .eq('requester_id', requesterId)
    .eq('recipient_id', recipientId)
    .eq('status', 'pending')
    .maybeSingle();
  return data !== null;
}

/** Dernier refus/expiration entre requester→recipient (pour cooldown) */
export async function getLastDeclineOrExpiry(
  supabase: SupabaseClient,
  requesterId: string,
  recipientId: string
): Promise<Date | null> {
  const { data } = await supabase
    .from(`${SCHEMA}.entraide_contact_requests`)
    .select('created_at')
    .eq('requester_id', requesterId)
    .eq('recipient_id', recipientId)
    .in('status', ['declined', 'expired'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? new Date(data.created_at) : null;
}

/**
 * Résout canal de contact. MOULE-ENTRAIDE.md §4 : ne s'exécute QUE si canRevealContactChannel(status) est vrai.
 * Pour MIDAS (trading), on retourne l'ID du chat interne (à créer si absent) — jamais d'email/téléphone brut.
 * L'app doit avoir une table chat_conversations ou équivalent (déjà présente selon le schéma existant).
 */
export async function resolveContactChannel(
  supabase: SupabaseClient,
  requestId: string
): Promise<string> {
  // 1. Récupérer les parties et revalider le consentement côté serveur.
  const { data: request } = await supabase
    .from(`${SCHEMA}.entraide_contact_requests`)
    .select('requester_id, recipient_id, status')
    .eq('id', requestId)
    .single();

  if (!request || request.status !== 'accepted') {
    throw new Error('Contact request not found or not accepted');
  }

  // 2. Chercher conversation existante entre ces 2 users (bidirectionnelle)
  const { data: existingConv } = await supabase
    .from(`${SCHEMA}.chat_conversations`)
    .select('id')
    .or(
      `and(user1_id.eq.${request.requester_id},user2_id.eq.${request.recipient_id}),and(user1_id.eq.${request.recipient_id},user2_id.eq.${request.requester_id})`
    )
    .maybeSingle();

  if (existingConv) return existingConv.id;

  // 3. Créer nouvelle conversation
  const { data: newConv, error } = await supabase
    .from(`${SCHEMA}.chat_conversations`)
    .insert({
      user1_id: request.requester_id,
      user2_id: request.recipient_id,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return newConv.id;
}

/** Incrémente compteur signalements actifs (admin-only visible) */
export async function reportProfile(
  supabase: SupabaseClient,
  reporterId: string,
  targetId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from(`${SCHEMA}.entraide_signalements`)
    .insert({
      reporter_id: reporterId,
      target_id: targetId,
      reason,
      created_at: new Date().toISOString(),
    });

  if (error) throw error;
}
