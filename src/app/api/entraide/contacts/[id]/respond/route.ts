// API POST /api/entraide/contacts/[id]/respond — répondre à une demande de contact
// Réponses: accept, decline, block

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { respondToContactRequest, canRevealContactChannel } from '@purama/entraide';
import { z } from 'zod';
import { resolveContactChannel } from '@/lib/entraide';

const respondSchema = z.object({
  response: z.enum(['accept', 'decline', 'block']),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const { response } = respondSchema.parse(body);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Charger demande actuelle
    const { data: request, error: requestError } = await supabase
      .from('midas.entraide_contact_requests')
      .select('requester_id, recipient_id, status')
      .eq('id', id)
      .single();

    if (requestError || !request) {
      return NextResponse.json(
        { error: 'Demande introuvable' },
        { status: 404 }
      );
    }

    // Seul le destinataire peut répondre
    if (request.recipient_id !== user.id) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas le destinataire de cette demande' },
        { status: 403 }
      );
    }

    // 2. Valider transition via la lib
    const result = respondToContactRequest(request.status as any, response);

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // 3. Mettre à jour statut
    const { error: updateError } = await supabase
      .from('midas.entraide_contact_requests')
      .update({
        status: result.status,
        responded_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 4. Si accepté, créer canal de contact (conversation chat interne)
    let channelId: string | null = null;
    if (canRevealContactChannel(result.status)) {
      channelId = await resolveContactChannel(supabase, id);
    }

    // 5. Si bloqué, ajouter dans entraide_blocages
    if (response === 'block') {
      await supabase.from('midas.entraide_blocages').insert({
        blocker_id: user.id,
        blocked_id: request.requester_id,
      });
    }

    return NextResponse.json({
      status: result.status,
      channelId, // null si declined/blocked, ID conversation si accepted
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[POST /api/entraide/contacts/[id]/respond]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réponse à la demande' },
      { status: 500 }
    );
  }
}
