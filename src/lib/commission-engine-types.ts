// =============================================================================
// MIDAS — Commission Engine Types
// =============================================================================

import type { CommissionType, PartnershipVersion } from '@/types/partnership';

export interface PartnerMinimal {
  id: string;
  partnership_version: PartnershipVersion;
  level2_partner_id: string | null;
  level3_partner_id: string | null;
  status: string;
}

export interface CommissionEvent {
  /** Le partner L1 direct de l'utilisateur payeur. */
  partnerId: string;
  /** Référence stripe pour la traçabilité. */
  stripePaymentId?: string | null;
  /** Référence partner_referrals, si disponible. */
  referralId?: string | null;
  /** Montant HT du paiement (en EUR, sans centimes). */
  paidAmountEur: number;
  /** Est-ce le tout premier paiement du filleul ? (utile v2 pour first_month). */
  isFirstPayment: boolean;
  /** Description humaine pour le log. */
  description?: string;
}

export interface CommissionRow {
  partner_id: string;
  referral_id: string | null;
  type: CommissionType;
  amount: number;
  currency: 'EUR';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  stripe_payment_id: string | null;
  description: string;
  level: number;
  partnership_version: PartnershipVersion;
}

export interface ResolvedChain {
  l1: PartnerMinimal;
  l2: PartnerMinimal | null;
  l3: PartnerMinimal | null;
}

export interface DispatchSuccess {
  ok: true;
  rows: CommissionRow[];
  insertedIds: string[];
}

export interface DispatchFailure {
  ok: false;
  error: string;
}

export type StripeDispatchResult =
  | { ok: true; status: 'ok'; dispatchedIds: string[]; amountEur: number }
  | { ok: true; status: 'skipped'; reason: StripeDispatchSkipReason }
  | { ok: false; status: 'failed'; error: string };

export type StripeDispatchSkipReason =
  | 'already_processed'
  | 'zero_amount'
  | 'no_user_id'
  | 'no_partner_referral'
  | 'partner_inactive'
  | 'no_commissions_computed';

export interface PartnerReferralRow {
  id: string;
  partner_id: string;
  referred_user_id: string;
  first_payment_at: string | null;
  status: 'pending' | 'active' | 'churned';
}

export interface LogInsert {
  stripe_invoice_id: string;
  stripe_customer_id: string | null;
  user_id: string | null;
  partner_id: string | null;
  amount_eur: number;
  is_first_payment: boolean;
  commission_ids: string[];
  status: 'ok' | 'skipped' | 'failed';
  skip_reason: string | null;
  error: string | null;
}
