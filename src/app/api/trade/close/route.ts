import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { fetchPaperQuote } from '@/lib/exchange/binance-public';
import { createServiceClient } from '@/lib/supabase/server';
import { applyPaperObservation } from '@/lib/trading/paper-position';

const bodySchema = z.object({
  tradeId: z.string().uuid(),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { tradeId } = parsed.data;
    const supabase = createServiceClient();

    // Fetch trade and verify ownership
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .single();

    if (tradeError || !trade) {
      return NextResponse.json({ error: 'Trade introuvable' }, { status: 404 });
    }

    // Décision Tissma D2=A (2026-09-05), contrat check-niyama-decisions.mjs :
    // fermeture en simulation uniquement. Un trade marqué non-paper (données
    // historiques antérieures) ne peut PAS déclencher d'ordre exchange —
    // aucun chemin ccxt n'existe ici.
    if (!trade.is_paper_trade) {
      return NextResponse.json(
        { error: 'Les positions réelles ne peuvent plus être fermées via MIDAS (éducation uniquement). Contacte ton exchange directement.' },
        { status: 403 },
      );
    }

    if (trade.status === 'closed') return NextResponse.json({ trade, replayed: true });
    if (trade.status !== 'open') return NextResponse.json({ error: 'Cette position ne peut pas être fermée' }, { status: 409 });
    const quote = await fetchPaperQuote(trade.pair);
    if (!quote) return NextResponse.json({ error: 'Prix récent indisponible ; aucune nouvelle clôture soumise' }, { status: 503 });
    try {
      const receipt = await applyPaperObservation(user.id, tradeId, quote, true);
      return NextResponse.json(receipt);
    } catch {
      // The transaction may already have committed. Retrying this trade reads
      // its closed state and cannot charge another exit fee.
      return NextResponse.json({ error: 'Clôture non confirmée ; vérifie ou relance la même position',
        tradeId, state: 'reconciliation_required' }, { status: 503 });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
