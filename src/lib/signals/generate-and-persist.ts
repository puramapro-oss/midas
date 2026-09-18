// =============================================================================
// MIDAS — Génération + persistance des signaux vérifiés
// Source unique partagée par /api/signals/generate (POST) et
// /api/cron/generate-signals (GET) — mêmes paires, même pipeline, même
// garde-fou d'échec global. Les routes ne gardent que leur contrat HTTP.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateVerifiedSignal } from './generate-verified-signal';

export const SIGNAL_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] as const;

export interface GeneratedSignalsResult {
  ok: boolean;
  generated: number;
  failures: Array<{ pair: string; error: string }>;
}

export async function generateAndPersistSignals(
  supabase: SupabaseClient,
): Promise<GeneratedSignalsResult> {
  // Désactiver les signaux expirés
  await supabase
    .from('signals')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString());

  const results = await Promise.allSettled(SIGNAL_PAIRS.map((pair) => generateVerifiedSignal(pair)));
  const signals = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const failures = results.flatMap((result, index) => (result.status === 'rejected'
    ? [{ pair: SIGNAL_PAIRS[index], error: result.reason instanceof Error ? result.reason.message : 'Echec analyse' }]
    : []));

  if (signals.length === 0) {
    return { ok: false, generated: 0, failures };
  }

  const { data, error } = await supabase.from('signals').insert(signals).select('id');
  if (error) {
    throw new Error(`Erreur insertion signaux: ${error.message}`);
  }
  return { ok: true, generated: data?.length ?? 0, failures };
}
