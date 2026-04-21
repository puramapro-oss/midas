/**
 * MIDAS — Types Karma Split V4.1 Axe 2
 *
 * Split automatique des abos Stripe (invoice.paid) sur 4 pools Purama :
 *   reward 50% · adya 10% · asso 10% · sasu 30%
 *
 * Voir migrations/v4.1-karma-split.sql + STRIPE_CONNECT_KARMA_V4.md §Flux.
 */

/** 5 pools Purama (3 historiques + 2 V4.1). */
export type KarmaPoolType = 'reward' | 'asso' | 'partner' | 'adya' | 'sasu';

/** Les 4 pools qui reçoivent le split automatique d'un paiement abo. */
export type KarmaSplitPool = 'reward' | 'adya' | 'asso' | 'sasu';

/** Pourcentages immuables du split (somme = 1.00). */
export const KARMA_SPLIT_RATES: Record<KarmaSplitPool, number> = {
  reward: 0.5,
  adya: 0.1,
  asso: 0.1,
  sasu: 0.3,
};

/** Résultat déterministe du calcul de split (en euros, 2 décimales). */
export interface KarmaSplitBreakdown {
  reward_eur: number;
  adya_eur: number;
  asso_eur: number;
  sasu_eur: number;
  /** Total effectivement distribué (= gross_eur ; invariant vérifié). */
  total_eur: number;
}

/** Raisons de skip possibles quand le dispatch ne crée pas de split. */
export type KarmaSplitSkipReason =
  | 'no_invoice_id'
  | 'no_amount_paid'
  | 'zero_amount'
  | 'already_processed';

/** Statut final du dispatch pour un invoice donné. */
export type KarmaSplitStatus = 'ok' | 'skipped' | 'failed';

/** Résultat retourné par dispatchKarmaSplit (jamais d'exception, toujours un objet). */
export interface KarmaSplitResult {
  ok: boolean;
  status: KarmaSplitStatus;
  skipReason?: KarmaSplitSkipReason;
  error?: string;
  /** UUID de la ligne karma_split_log créée (sauf skip already_processed). */
  logId?: string;
  /** UUIDs des 4 pool_transactions créées si status=ok. */
  poolTxIds?: string[];
  breakdown?: KarmaSplitBreakdown;
}

/** Row de midas.karma_split_log (lecture admin/audit). */
export interface KarmaSplitLog {
  id: string;
  stripe_invoice_id: string;
  stripe_customer_id: string | null;
  user_id: string | null;
  amount_eur_gross: number;
  split_reward_eur: number;
  split_adya_eur: number;
  split_asso_eur: number;
  split_sasu_eur: number;
  status: KarmaSplitStatus;
  skip_reason: KarmaSplitSkipReason | null;
  error: string | null;
  pool_tx_ids: string[];
  created_at: string;
}

/** Row de midas.cpa_earnings (tracking CPA partenaires qui financent les primes). */
export interface CpaEarning {
  id: string;
  user_id: string | null;
  app_id: string;
  partner: string;
  amount_eur: number;
  received_at: string;
  covers_prime_palier: 1 | 2 | 3 | null;
  external_ref: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
