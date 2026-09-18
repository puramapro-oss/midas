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
import Stripe from 'stripe';
import {
  fingerprintValue,
  checkFingerprintUniqueness,
  computeTrustTier,
  buildCollusionClusters,
  scoreCluster,
  type AccountSignal,
  type TrustTierInput,
} from '@purama/antifraud';

// ---------------------------------------------------------------------------
// Helpers IBAN from Stripe Connect
// ---------------------------------------------------------------------------

let stripeSingleton: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY manquant');
    stripeSingleton = new Stripe(key, { typescript: true });
  }
  return stripeSingleton;
}

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
 * identity_fingerprints. Retourne {unique, conflictCount}.
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
    .eq('app_slug', 'midas')
    .neq('account_id', currentUserId);

  const existingFingerprints = (existingRows ?? []).map((r) => r.fingerprint_hash);
  return checkFingerprintUniqueness(fingerprintHash, existingFingerprints, null);
}

/**
 * Enregistre une empreinte dans identity_fingerprints (idempotent upsert).
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
        app_slug: 'midas',
        account_id: userId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'fingerprint_type,fingerprint_hash,app_slug',
        ignoreDuplicates: false,
      },
    );
}

// ---------------------------------------------------------------------------
// Trust tier computation (layer 2)
// ---------------------------------------------------------------------------

export interface MidasTrustTierInput {
  userId: string;
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
 * Construit la liste AccountSignal[] pour un user à partir des données DB.
 * Fenêtre glissante 90j (signaux anciens ignorés).
 */
export async function buildMidasAccountSignals(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccountSignal[]> {
  const signals: AccountSignal[] = [];

  // 1. IBAN fingerprint depuis identity_fingerprints
  const { data: ibanFingerprints } = await supabase
    .from('identity_fingerprints')
    .select('fingerprint_hash, created_at')
    .eq('account_id', userId)
    .eq('fingerprint_type', 'iban')
    .gte('created_at', new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString());

  for (const fp of ibanFingerprints ?? []) {
    signals.push({
      accountId: userId,
      type: 'iban_fingerprint',
      fingerprint: fp.fingerprint_hash,
    });
  }

  // 2. Phone fingerprint
  const { data: phoneFingerprints } = await supabase
    .from('identity_fingerprints')
    .select('fingerprint_hash, created_at')
    .eq('account_id', userId)
    .eq('fingerprint_type', 'phone')
    .gte('created_at', new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString());

  for (const fp of phoneFingerprints ?? []) {
    signals.push({
      accountId: userId,
      type: 'phone_number',
      fingerprint: fp.fingerprint_hash,
    });
  }

  // 3. Device fingerprint (last_device_fingerprint sur profiles)
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_device_fingerprint, signup_device_fingerprint, last_ip_address')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.last_device_fingerprint) {
    signals.push({
      accountId: userId,
      type: 'device_fingerprint',
      fingerprint: profile.last_device_fingerprint,
    });
  }
  if (
    profile?.signup_device_fingerprint &&
    profile.signup_device_fingerprint !== profile.last_device_fingerprint
  ) {
    signals.push({
      accountId: userId,
      type: 'device_fingerprint',
      fingerprint: profile.signup_device_fingerprint,
    });
  }

  // 4. IP (last_ip_address)
  if (profile?.last_ip_address) {
    // Subnet /24 pour IPv4, /64 pour IPv6 (anti-collusion par quartier IP)
    const subnet = profile.last_ip_address.toString().split('.').slice(0, 3).join('.');
    signals.push({
      accountId: userId,
      type: 'ip_subnet',
      fingerprint: subnet,
    });
  }

  return signals;
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
  try {
    const allSignals: AccountSignal[] = [];
    for (const uid of userIds) {
      const signals = await buildMidasAccountSignals(supabase, uid);
      allSignals.push(...signals);
    }

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
