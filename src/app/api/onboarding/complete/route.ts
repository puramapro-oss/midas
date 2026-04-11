import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const RISK_MAP = ['prudent', 'modere', 'agressif'] as const;

const bodySchema = z.object({
  riskLevel: z.number().min(0).max(2),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const riskText = RISK_MAP[parsed.data.riskLevel];
    const maxPositionPct = [2, 5, 10][parsed.data.riskLevel];

    // IMPORTANT: on écrit dans public.profiles — c'est le schéma que lit
    // useAuth côté client. Écrire dans midas.profiles créait une boucle
    // infinie (la flag n'était jamais vue côté client → redirect onboarding).
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upsert (et pas update) : suivant l'historique du compte, la row
    // public.profiles peut exister ou pas. Upsert gère les deux cas sans
    // dépendre d'un trigger. On ne réinitialise paper_trading_until que s'il
    // est null pour garder la date initiale éventuellement déjà posée.
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('paper_trading_until')
      .eq('id', user.id)
      .maybeSingle();

    const upsertPayload: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      onboarding_completed: true,
    };
    if (!existingProfile?.paper_trading_until) {
      upsertPayload.paper_trading_until = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert(upsertPayload, { onConflict: 'id' });

    if (profileError) {
      return NextResponse.json(
        { error: `Erreur profil: ${profileError.message}` },
        { status: 500 },
      );
    }

    // Upsert bot_config with risk settings
    const { error: configError } = await serviceClient
      .from('bot_config')
      .upsert({
        user_id: user.id,
        risk_level: riskText,
        max_position_pct: maxPositionPct,
        paper_trading: true,
        is_active: false,
      }, { onConflict: 'user_id' });

    if (configError) {
      // Non-blocking: profile is already updated, bot_config can be retried
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
