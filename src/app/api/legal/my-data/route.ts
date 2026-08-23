/**
 * GET /api/legal/my-data — export complet des données personnelles au format JSON
 * (droit à la portabilité, art. 20 RGPD ; page « Ma mémoire »). Lit réellement les
 * tables MIDAS contenant des données personnelles, jamais un stub `{success:true}`.
 *
 * `exchange_connections` est exporté avec une liste de colonnes explicite (jamais
 * `select('*')`) pour ne jamais inclure `api_key_encrypted`/`api_secret_encrypted`/
 * `encryption_iv` dans un fichier JSON téléchargeable, même chiffrées.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLegalServiceClient } from '@/lib/legal/db';

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });

  const legalDb = getLegalServiceClient();

  const [
    { data: profile },
    { data: trades },
    { data: chatMessages },
    { data: exchangeConnections },
    { data: acceptances },
    { data: cookieConsent },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('trades').select('*').eq('user_id', user.id),
    supabase.from('chat_messages').select('*').eq('user_id', user.id),
    supabase
      .from('exchange_connections')
      .select('id, exchange, is_active, is_testnet, status, last_connected_at, created_at, updated_at')
      .eq('user_id', user.id),
    legalDb.from('legal_acceptances').select('doc_type, version, accepted_at').eq('user_id', user.id),
    legalDb.from('cookie_consents').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    compte: { id: user.id, email: user.email, createdAt: user.created_at },
    profile: profile ?? null,
    trades: trades ?? [],
    conversationsIA: chatMessages ?? [],
    connexionsExchange: exchangeConnections ?? [],
    acceptationsLegales: acceptances ?? [],
    consentementCookies: cookieConsent ?? null,
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="mes-donnees-midas.json"',
    },
  });
}
