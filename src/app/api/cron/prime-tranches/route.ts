// =============================================================================
// MIDAS — CRON Prime Tranches (V6 §10)
// Exécute chaque jour — crédit tranches 2 (M+1) et 3 (M+2) dues aujourd'hui.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } },
  );
}

export async function GET(request: Request) {
  // Vercel Cron — secret header
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = adminSupabase();
  const now = new Date().toISOString();

  // Toutes les tranches scheduled dont la date est dépassée
  const { data: due, error } = await supabase
    .from('prime_tranches')
    .select('id, user_id, amount, palier')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ user_id: string; palier: number; amount: number; ok: boolean }> = [];

  for (const tr of due ?? []) {
    // Skip si user a résilié avant échéance
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', tr.user_id)
      .maybeSingle();

    if (!profile || profile.subscription_status !== 'active') {
      await supabase
        .from('prime_tranches')
        .update({ status: 'cancelled', cancelled_at: now })
        .eq('id', tr.id);
      results.push({ user_id: tr.user_id, palier: tr.palier, amount: Number(tr.amount), ok: false });
      continue;
    }

    // Crédit wallet + marque credited
    const { error: rpcErr } = await supabase.rpc('increment_wallet_balance', {
      uid: tr.user_id,
      delta: Number(tr.amount),
    });

    if (rpcErr) {
      results.push({ user_id: tr.user_id, palier: tr.palier, amount: Number(tr.amount), ok: false });
      continue;
    }

    await supabase
      .from('prime_tranches')
      .update({ status: 'credited', credited_at: now })
      .eq('id', tr.id);

    results.push({ user_id: tr.user_id, palier: tr.palier, amount: Number(tr.amount), ok: true });
  }

  return NextResponse.json({
    processed: results.length,
    credited: results.filter((r) => r.ok).length,
    cancelled: results.filter((r) => !r.ok).length,
    results,
  });
}
