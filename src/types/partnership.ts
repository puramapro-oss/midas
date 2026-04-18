// =============================================================================
// MIDAS — Partnership Types
// Types pour le systeme de partenariat universel Purama
// =============================================================================

export type PartnerChannel = 'influencer' | 'website' | 'media' | 'physical';
export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'banned';
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type CommissionType = 'first_month' | 'recurring' | 'level2' | 'level3';
export type PartnershipVersion = 'v2' | 'v3';
export type PartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend';

// Milestone tiers: referrals → bonus amount
export const MILESTONE_TIERS: Record<number, number> = {
  10: 50,
  25: 150,
  50: 400,
  100: 1000,
  250: 3000,
  500: 6500,
  1000: 11100,
  5000: 50000,
  10000: 100000,
};

// Tier thresholds based on total referrals
export const TIER_THRESHOLDS: Record<PartnerTier, number> = {
  bronze: 0,
  silver: 10,
  gold: 25,
  platinum: 50,
  diamond: 100,
  legend: 500,
};

// -----------------------------------------------------------------------------
// Commission rates — 2 barèmes coexistent (backward-compat)
// -----------------------------------------------------------------------------
// V2 (legacy 2-niveaux) : 50% first_month + 10% recurring + 15% L2.
// V3 (nouveau 3-niveaux lifetime) : 50% L1 à vie + 15% L2 à vie + 7% L3 à vie.
//
// Tous les partners existants avant la migration `v7-partnership-v4.sql` sont
// en v2. Tout nouveau partner est en v3 (default column). Le CommissionEngine
// choisit le bon barème selon `partners.partnership_version`.
// -----------------------------------------------------------------------------

// V2 (legacy)
export const COMMISSION_RATES_V2 = {
  first_month: 0.5,
  recurring: 0.1,
  level2: 0.15,
  level3: 0, // V2 n'a pas de niveau 3
} as const;

// V3 (3 niveaux lifetime)
export const COMMISSION_RATES_V3 = {
  first_month: 0.5, // idem L1 first_month, mais continue à vie via recurring
  recurring: 0.5, // 50% lifetime sur L1
  level2: 0.15, // 15% lifetime sur L2
  level3: 0.07, // 7% lifetime sur L3
} as const;

/** Back-compat export — réfère à V2 pour ne pas casser les consommateurs existants. */
export const COMMISSION_RATES = COMMISSION_RATES_V2;

export function getCommissionRates(version: PartnershipVersion) {
  return version === 'v3' ? COMMISSION_RATES_V3 : COMMISSION_RATES_V2;
}

export const TIER_LABELS: Record<PartnerTier, string> = {
  bronze: 'Bronze',
  silver: 'Argent',
  gold: 'Or',
  platinum: 'Platine',
  diamond: 'Diamant',
  legend: 'Legende',
};

export const TIER_COLORS: Record<PartnerTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  legend: '#FF6B6B',
};

export const CHANNEL_LABELS: Record<PartnerChannel, string> = {
  influencer: 'Influenceur',
  website: 'Site web',
  media: 'Media',
  physical: 'Physique',
};

export const CHANNEL_DESCRIPTIONS: Record<PartnerChannel, string> = {
  influencer: 'Createurs de contenu, YouTubers, streamers, influenceurs crypto',
  website: 'Blogs, sites d\'actualites, comparateurs, forums',
  media: 'Journalistes, podcasters, newsletters, presse specialisee',
  physical: 'Formateurs, evenements, meetups, conferences',
};

export interface Partner {
  id: string;
  user_id: string;
  channel: PartnerChannel;
  code: string;
  slug: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  social_links: Record<string, string>;
  status: PartnerStatus;
  total_scans: number;
  total_referrals: number;
  total_earned: number;
  current_balance: number;
  tier: PartnerTier;
  milestone_reached: number;
  iban: string | null;
  payout_threshold: number;
  level2_partner_id: string | null;
  level3_partner_id: string | null;
  partnership_version: PartnershipVersion;
  created_at: string;
  updated_at: string;
}

export interface PartnerScan {
  id: string;
  partner_id: string;
  code: string;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  city: string | null;
  referrer_url: string | null;
  created_at: string;
}

export interface PartnerReferral {
  id: string;
  partner_id: string;
  referred_user_id: string;
  referred_email: string | null;
  status: 'pending' | 'active' | 'churned';
  first_payment_at: string | null;
  total_commission_earned: number;
  created_at: string;
  updated_at: string;
}

export interface PartnerCommission {
  id: string;
  partner_id: string;
  referral_id: string | null;
  type: CommissionType;
  amount: number;
  currency: string;
  status: CommissionStatus;
  stripe_payment_id: string | null;
  description: string | null;
  level: number;
  partnership_version: PartnershipVersion;
  created_at: string;
  updated_at: string;
}

export interface PartnerMilestone {
  id: string;
  partner_id: string;
  milestone_referrals: number;
  bonus_amount: number;
  achieved_at: string;
  paid: boolean;
  created_at: string;
}

export interface PartnerPayout {
  id: string;
  partner_id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  iban: string | null;
  reference: string | null;
  requested_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerCoachMessage {
  id: string;
  partner_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_used: number;
  created_at: string;
}

export interface PartnerStats {
  totalScans: number;
  totalReferrals: number;
  totalEarned: number;
  currentBalance: number;
  pendingCommissions: number;
  tier: PartnerTier;
  milestoneReached: number;
  scansThisMonth: number;
  referralsThisMonth: number;
  earningsThisMonth: number;
  conversionRate: number;
}
