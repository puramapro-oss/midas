// =============================================================================
// MIDAS — Génération + persistance des signaux vérifiés
// Source unique partagée par /api/signals/generate (POST) et
// /api/cron/generate-signals (GET) — mêmes paires, même pipeline, même
// garde-fou d'échec global. Les routes ne gardent que leur contrat HTTP.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { generateVerifiedSignal } from './generate-verified-signal';

export const SIGNAL_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] as const;
const insertionReceipt = z.array(z.object({ id: z.uuid() }));

export interface GeneratedSignalsResult {
  ok: boolean;
  generated: number;
  failures: Array<{ pair: string; error: string }>;
}

export async function generateAndPersistSignals(
  supabase: SupabaseClient,
): Promise<GeneratedSignalsResult> {
  // Désactiver les signaux expirés
  const { error: expirationError } = await supabase
    .from('signals')
    .update({ is_active: false })
    .lte('expires_at', new Date().toISOString());
  if (expirationError) {
    throw new Error('Impossible de désactiver les signaux expirés.');
  }

  const results = await Promise.allSettled(SIGNAL_PAIRS.map((pair) => generateVerifiedSignal(pair)));
  const signals = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const failures = results.flatMap((result, index) => (result.status === 'rejected'
    ? [{ pair: SIGNAL_PAIRS[index], error: result.reason instanceof Error ? result.reason.message : 'Echec analyse' }]
    : []));

  if (signals.length === 0) {
    return { ok: false, generated: 0, failures };
  }

  try {
    const { data, error } = await supabase.from('signals').insert(signals).select('id');
    const receipt = insertionReceipt.safeParse(data);
    if (error || !receipt.success) throw new Error('Unconfirmed signal receipt');
    const ids = receipt.data.map((row) => row.id.toLowerCase());
    if (ids.length !== signals.length || new Set(ids).size !== ids.length) {
      throw new Error('Unconfirmed signal receipt');
    }
    return { ok: true, generated: ids.length, failures };
  } catch {
    // The write may already have committed. Do not retry or imply a rollback.
    throw new Error('Résultat de l’enregistrement des signaux non confirmé.');
  }
}
