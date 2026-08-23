/**
 * POST /api/legal/accept — enregistre une preuve d'acceptation horodatée (qui/quelle
 * version/quand) d'un document légal (CGU, CGV ou politique de confidentialité).
 * Appelé automatiquement à la création de compte (cf src/app/register/page.tsx).
 *
 * La version enregistrée est TOUJOURS `CURRENT_LEGAL_VERSIONS[docType]` calculée côté
 * serveur — jamais une valeur envoyée par le client, pour qu'un client ne puisse pas
 * falsifier la preuve en prétendant avoir accepté une version qu'il n'a jamais vue.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getLegalServiceClient } from '@/lib/legal/db';
import { CURRENT_LEGAL_VERSIONS } from '@/lib/legal/versions';

const bodySchema = z.object({
  docType: z.enum(['mentions', 'cgu', 'cgv', 'confidentialite']),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const legalDb = getLegalServiceClient();
  const { error } = await legalDb.from('legal_acceptances').upsert(
    {
      user_id: user.id,
      doc_type: parsed.data.docType,
      version: CURRENT_LEGAL_VERSIONS[parsed.data.docType],
      accepted_at: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: req.headers.get('user-agent'),
    },
    { onConflict: 'user_id,doc_type' }
  );

  if (error) {
    return NextResponse.json({ error: 'Enregistrement impossible.', debug: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
