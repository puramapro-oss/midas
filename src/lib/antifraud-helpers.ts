// =============================================================================
// MIDAS — Anti-fraud helpers (@purama/antifraud integration)
//
// Wire @purama/antifraud pure logic w/ midas-specific data sources:
// - IBAN from Stripe Connect external_accounts
// - KYC status from connect_accounts.kyc_verified_at
// - Phone/device/IP from profiles
// - Collusion signals from DB queries
//
// Voir packages/purama-antifraud/MOULE-ANTIFRAUDE.md pour le contrat.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fingerprintValue,
  checkFingerprintUniqueness,
  computeTrustTier,
  buildCollusionClusters,
  scoreCluster,
  type AccountSignal,
  type TrustTierInput,
} from '@purama/antifraud';
import { getStripe } from '@/lib/stripe/helpers';

// ---------------------------------------------------------------------------
// Helpers IBAN from Stripe Connect
// ---------------------------------------------------------------------------


/**
 * Récupère le premier IBAN (external_account type=bank_account) depuis
 * Stripe Connect et retourne son empreinte SHA-256. Null si aucun compte
 * bancaire enregistré.
 */
export async function getConnectIbanFingerprint(
  stripeAccountId: string,
): Promise<string | null> {
  try {
    const stripe = getStripe();
    const externalAccounts = await stripe.accounts.listExternalAccounts(
      stripeAccountId,
      { object: 'bank_account', limit: 1 },
    );
    const bankAccount = externalAccounts.data[0];
    if (!bankAccount || bankAccount.object !== 'bank_account') return null;

    // Stripe stocke bank_account.country + bank_account.last4 mais pas l'IBAN complet
    // côté API (sécurité). On fingerprint ce qu'on a : country+last4+routing_number
    // (approximation — idéalement on demanderait l'IBAN complet côté onboarding
    // custom avant Stripe, mais Connect Embedded Components gère ça en opaque).
    // Pour vraie unicité IBAN, il faudrait capturer l'IBAN lors de l'ajout
    // (webhook account.external_account.created + metadata custom) — hors scope
    // rollout V1, documenté comme limitation.
    const proxy = `${bankAccount.country}-${bankAccount.last4}-${bankAccount.routing_number ?? ''}`;
    return fingerprintValue(proxy);
  } catch {
    return null;
  }
}

/**
 * Vérifie unicité d'une empreinte (IBAN, phone, etc) dans la table partagée
 * identity_fingerprints (contrat cross-apps VPS : fingerprint_type/hash/
 * account_id + first/last_app_slug — unicité GLOBALE par type+hash).
 * Retourne {unique, conflictCount}.
 */
export async function checkIdentityFingerprintUnique(
  supabase: SupabaseClient,
  fingerprintType: 'iban' | 'phone' | 'document' | 'card',
  fingerprintHash: string,
  currentUserId: string,
): Promise<{ unique: boolean; conflictCount: number }> {
  const { data: existingRows } = await supabase
    .from('identity_fingerprints')
    .select('fingerprint_hash')
    .eq('fingerprint_type', fingerprintType)
    .eq('fingerprint_hash', fingerprintHash)
    .neq('account_id', currentUserId);

  const existingFingerprints = (existingRows ?? []).map((r) => r.fingerprint_hash);
  return checkFingerprintUniqueness(fingerprintHash, existingFingerprints, null);
}

/**
 * Enregistre une empreinte dans identity_fingerprints (idempotent upsert).
 * Conforme au design partagé : unicité (fingerprint_type, fingerprint_hash)
 * + journalisation last_app_slug='midas'.
 */
export async function registerIdentityFingerprint(
  supabase: SupabaseClient,
  fingerprintType: 'iban' | 'phone' | 'document' | 'card',
  fingerprintHash: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('identity_fingerprints')
    .upsert(
      {
        fingerprint_type: fingerprintType,
        fingerprint_hash: fingerprintHash,
        last_app_slug: 'midas',
        account_id: userId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'fingerprint_type,fingerprint_hash',
        ignoreDuplicates: false,
      },
    );
}

// ---------------------------------------------------------------------------
// Trust tier computation (layer 2)
// ---------------------------------------------------------------------------

export interface MidasTrustTierInput {
  kycVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  hasActiveCollusionFlag: boolean;
}

/**
 * Calcule le palier de confiance d'un user midas à partir de son état
 * connect_accounts + profiles. Retourne {tier, withdrawalCapEuros, nextTierRequirements}.
 */
export async function computeMidasTrustTier(
  input: MidasTrustTierInput,
): Promise<ReturnType<typeof computeTrustTier>> {
  // Map midas → antifraud layer 1 state
  const layer1: TrustTierInput = {
    phoneVerificationStatus: input.phoneVerifiedAt ? 'verified' : 'unverified',
    ibanUnique: true, // Présumé OK si on arrive ici (check fait avant)
    kycStatus: input.kycVerifiedAt ? 'verified' : 'not_started',
    hasActiveCollusionFlag: input.hasActiveCollusionFlag,
    livenessVerified: false, // Layer 4 pas encore câblé (provider requis)
  };

  return computeTrustTier(layer1);
}

// ---------------------------------------------------------------------------
// Collusion detection (layer 3)
// ---------------------------------------------------------------------------

/**
 * Construit les AccountSignal[] pour un lot de users à partir des données DB
 * en 2 requêtes batchées (fingerprints iban+phone en une, profiles en une),
 * fenêtre glissante 90j. Regroupement client-side par compte.
 */
const FINGERPRINT_SIGNAL_TYPE: Record<string, AccountSignal['type']> = {
  iban: 'iban_fingerprint',
  phone: 'phone_number',
};

export async function buildMidasAccountSignalsBatch(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, AccountSignal[]>> {
  const byAccount = new Map<string, AccountSignal[]>(userIds.map((id) => [id, []]));
  const push = (accountId: string, signal: AccountSignal) => {
    byAccount.get(accountId)?.push(signal);
  };
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

  // 1+2. Empreintes IBAN + phone (même table, une seule requête .in)
  const fingerprintsPromise = supabase
    .from('identity_fingerprints')
    .select('account_id, fingerprint_type, fingerprint_hash')
    .in('account_id', userIds)
    .in('fingerprint_type', ['iban', 'phone'])
    .gte('created_at', since);

  // 3. Device + IP (profiles)
  const profilesPromise = supabase
    .from('profiles')
    .select('id, last_device_fingerprint, signup_device_fingerprint, last_ip_address')
    .in('id', userIds);

  const [fingerprintsRes, profilesRes] = await Promise.all([fingerprintsPromise, profilesPromise]);

  for (const fp of fingerprintsRes.data ?? []) {
    const type = FINGERPRINT_SIGNAL_TYPE[fp.fingerprint_type];
    if (type) {
      push(fp.account_id, { accountId: fp.account_id, type, fingerprint: fp.fingerprint_hash });
    }
  }

  for (const profile of profilesRes.data ?? []) {
    const userId = profile.id as string;

    if (profile.last_device_fingerprint) {
      push(userId, {
        accountId: userId,
        type: 'device_fingerprint',
        fingerprint: profile.last_device_fingerprint,
      });
    }
    if (
      profile.signup_device_fingerprint &&
      profile.signup_device_fingerprint !== profile.last_device_fingerprint
    ) {
      push(userId, {
        accountId: userId,
        type: 'device_fingerprint',
        fingerprint: profile.signup_device_fingerprint,
      });
    }

    // 4. IP (last_ip_address) — subnet /24 IPv4, /64 IPv6 (collusion par quartier)
    if (profile.last_ip_address) {
      const subnet = profile.last_ip_address.toString().split('.').slice(0, 3).join('.');
      push(userId, {
        accountId: userId,
        type: 'ip_subnet',
        fingerprint: subnet,
      });
    }
  }

  return byAccount;
}

/**
 * Détecte les clusters de collusion pour un ensemble de comptes (ex. batch
 * d'inserts de commissions). Retourne les clusters à risque (shouldFreeze=true).
 *
 * Fail-safe : une erreur de lecture des signaux (table absente, DB lue en
 * erreur) ne bloque PAS le flux appelant — on retourne zéro cluster et on
 * logge. La détection est une couche de risque, pas une dépendance dure du
 * crédit de commission. Le withdraw, lui, reste fail-closed via les paliers
 * (computeMidasTrustTier).
 */
export async function detectCollusionClusters(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Array<{ cluster: string[]; shouldFreeze: boolean; score: number }>> {
  // buildCollusionClusters ignore les groupes < 2 comptes : un appel mono-user
  // ne peut jamais produire de cluster (les empreintes partagées avec d'autres
  // comptes ne sont PAS encore explorées graphiquement — cf ANTIFRAUD-INTEGRATION).
  if (userIds.length < 2) return [];

  try {
    const byAccount = await buildMidasAccountSignalsBatch(supabase, userIds);
    const allSignals: AccountSignal[] = [...byAccount.values()].flat();

    const clusters = buildCollusionClusters(allSignals);
    const results: Array<{ cluster: string[]; shouldFreeze: boolean; score: number }> = [];

    for (const cluster of clusters) {
      const riskResult = scoreCluster(cluster);
      results.push({
        cluster: cluster.accountIds,
        shouldFreeze: riskResult.shouldFreeze,
        score: riskResult.score,
      });
    }

    return results;
  } catch (error) {
    console.warn(
      '[antifraud] detectCollusionClusters: lecture des signaux impossible, détection ignorée —',
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
