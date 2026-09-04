// API /api/entraide/contacts — demandes de contact sécurisé
// GET: liste reçues+envoyées | POST: créer demande

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { canSendContactRequest } from '@purama/entraide';
import { z } from 'zod';
import {
  getContactRequestsSentToday,
  getPendingRequestToRecipient,
  getLastDeclineOrExpiry,
  getBlockedUserIds,
} from '@/lib/entraide';

const createContactSchema = z.object({
  recipientId: z.string().uuid(),
  message: z.string().max(500).optional(),
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

    // Demandes reçues
    const { data: received, error: receivedError } = await supabase
      .from('midas.entraide_contact_requests')
      .select('id, requester_id, message, status, created_at')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (receivedError) throw receivedError;

    // Demandes envoyées
    const { data: sent, error: sentError } = await supabase
      .from('midas.entraide_contact_requests')
      .select('id, recipient_id, message, status, created_at')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    if (sentError) throw sentError;

    return NextResponse.json({
      received: received || [],
      sent: sent || [],
    });
  } catch (error) {
    console.error('[GET /api/entraide/contacts]', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des demandes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const validated = createContactSchema.parse(body);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 1. Vérifier éligibilité via la lib (anti-abus)
    const [sentToday, hasPending, lastDecline, blockedByRecipient] =
      await Promise.all([
        getContactRequestsSentToday(supabase, user.id),
        getPendingRequestToRecipient(supabase, user.id, validated.recipientId),
        getLastDeclineOrExpiry(supabase, user.id, validated.recipientId),
        getBlockedUserIds(supabase, validated.recipientId).then((blocked) =>
          blocked.includes(user.id)
        ),
      ]);

    const eligibility = canSendContactRequest({
      requesterId: user.id,
      recipientId: validated.recipientId,
      isBlockedByRecipient: blockedByRecipient,
      requesterRequestsSentToday: sentToday,
      hasPendingRequestToSameRecipient: hasPending,
      lastDeclineOrExpiryToSameRecipient: lastDecline,
      now: new Date(),
    });

    if (!eligibility.allowed) {
      const messages: Record<string, string> = {
        self_contact: 'Vous ne pouvez pas vous envoyer de demande',
        blocked_by_recipient: 'Ce trader vous a bloqué',
        already_pending: 'Une demande est déjà en attente',
        daily_limit_reached: 'Limite quotidienne atteinte (10 demandes/jour)',
        cooldown_active: 'Veuillez attendre 7 jours après le dernier refus',
      };
      return NextResponse.json(
        { error: messages[eligibility.reason] || eligibility.reason },
        { status: 400 }
      );
    }

    // 2. Créer demande (verrou anti-doublon = index unique sur (requester_id, recipient_id) WHERE status='pending')
    const { data, error } = await supabase
      .from('midas.entraide_contact_requests')
      .insert({
        requester_id: user.id,
        recipient_id: validated.recipientId,
        message: validated.message || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation (doublon détecté malgré le check — race condition)
        return NextResponse.json(
          { error: 'Une demande est déjà en attente' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ requestId: data.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[POST /api/entraide/contacts]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la demande' },
      { status: 500 }
    );
  }
}
