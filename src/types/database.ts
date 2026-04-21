export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin' | 'super_admin' | 'influencer';
  plan: 'free' | 'pro' | 'ultra';
  billing_period: 'monthly' | 'yearly' | null;
  credits: number;
  daily_questions_used: number;
  daily_questions_limit: number;
  daily_questions_reset_at: string | null;
  referral_code: string | null;
  referred_by: string | null;
  wallet_balance: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legende';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  onboarding_completed: boolean;
  tutorial_completed: boolean;
  xp_total: number;
  level: number;
  streak_days: number;
  theme: 'dark' | 'oled' | 'light';
  notification_email: boolean;
  notification_push: boolean;
  notification_sms: boolean;
  login_count: number;
  total_messages_sent: number;
  total_tokens_used: number;
  daily_trades_used: number;
  daily_trades_reset_at: string | null;
  risk_profile: 'very_conservative' | 'conservative' | 'moderate' | 'aggressive';
  max_loss_daily: number;
  max_loss_weekly: number;
  max_loss_monthly: number;
  daily_loss_accumulated: number;
  weekly_loss_accumulated: number;
  monthly_loss_accumulated: number;
  auto_trade_enabled: boolean;
  interface_mode: 'simple' | 'expert';
  display_currency: 'EUR' | 'USD' | 'BTC';
  shield_active: boolean;
  plan_expires_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  message_count: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  feedback: 'positive' | 'negative' | null;
  created_at: string;
  updated_at: string;
}

export type Plan = Profile['plan'];
export type Role = Profile['role'];

// Purama Points
export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earn' | 'spend' | 'convert';
  source: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface ShopItem {
  id: string;
  category: 'reduction' | 'subscription' | 'ticket' | 'feature' | 'cash';
  name: string;
  description: string | null;
  cost_points: number;
  value: string | null;
  is_active: boolean;
  max_purchases: number | null;
  created_at: string;
}

export interface DailyGift {
  id: string;
  user_id: string;
  gift_type: 'points' | 'coupon' | 'ticket' | 'credits' | 'big_points' | 'mega_coupon';
  gift_value: string;
  streak_count: number;
  opened_at: string;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'trading' | 'social' | 'learning' | 'streak' | 'milestone';
  points_reward: number;
  xp_reward: number;
  condition_type: string;
  condition_value: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

// Communauté
export interface LoveWallPost {
  id: string;
  user_id: string;
  content: string;
  type: 'victory' | 'encouragement' | 'milestone' | 'gratitude';
  reactions_count: number;
  pinned: boolean;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null };
}

export interface LoveCircle {
  id: string;
  name: string;
  objective: string;
  max_members: number;
  current_members: number;
  status: 'active' | 'full' | 'archived';
  created_at: string;
}

export interface Buddy {
  id: string;
  user_a: string;
  user_b: string;
  streak_days: number;
  status: 'active' | 'paused' | 'ended';
  matched_at: string;
}

export interface LotteryDraw {
  id: string;
  draw_date: string;
  pool_amount: number;
  status: 'upcoming' | 'live' | 'completed';
  created_at: string;
}

export interface LotteryTicket {
  id: string;
  user_id: string;
  draw_id: string | null;
  source: string;
  created_at: string;
}

export type TradeSide = 'buy' | 'sell';
export type TradeType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type SignalStrength = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

// KYC
export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type KycTier = 0 | 1 | 2 | 3;
export type DocumentType = 'passport' | 'id_card' | 'driver_license';

export interface KycVerification {
  id: string;
  user_id: string;
  status: KycStatus;
  tier: KycTier;
  full_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  document_type: DocumentType | null;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  proof_of_address_url: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export const KYC_TIER_LIMITS: Record<KycTier, { label: string; withdrawalMax: number; description: string }> = {
  0: { label: 'Non vérifié', withdrawalMax: 0, description: 'Complète la vérification pour débloquer les retraits' },
  1: { label: 'Email vérifié', withdrawalMax: 500, description: 'Retrait max 500€/mois' },
  2: { label: 'Identité vérifiée', withdrawalMax: 5000, description: 'Retrait max 5 000€/mois' },
  3: { label: 'Vérifié avancé', withdrawalMax: 999999, description: 'Retrait illimité' },
};

// Stripe Connect Express (Embedded Components) — V4.1
export interface ConnectAccount {
  user_id: string;
  stripe_account_id: string;
  country: string;
  default_currency: string;
  onboarding_completed: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  kyc_verified_at: string | null;
  disabled_reason: string | null;
  capabilities: Record<string, unknown>;
  requirements: Record<string, unknown>;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export type ConnectOnboardingStage =
  | 'not_started'
  | 'in_progress'
  | 'requirements_due'
  | 'verified';

export interface ConnectAccountSummary {
  stripe_account_id: string | null;
  stage: ConnectOnboardingStage;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
  disabled_reason: string | null;
  requirements_summary: {
    currently_due: string[];
    past_due: string[];
    eventually_due: string[];
  };
}

// Copy Trading
export interface TraderProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  total_pnl: number;
  total_pnl_pct: number;
  win_rate: number;
  total_trades: number;
  avg_holding_time_hours: number;
  max_drawdown: number;
  sharpe_ratio: number;
  followers_count: number;
  copiers_count: number;
  min_copy_amount: number;
  max_copiers: number;
  commission_pct: number;
  is_verified: boolean;
  ranking_score: number;
  last_trade_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CopyRelationship {
  id: string;
  copier_id: string;
  trader_id: string;
  status: 'active' | 'paused' | 'stopped';
  copy_amount: number;
  copy_ratio: number;
  total_copied_trades: number;
  total_pnl: number;
  commission_paid: number;
  started_at: string;
  stopped_at: string | null;
  created_at: string;
  trader?: TraderProfile;
}

export interface CopyTrade {
  id: string;
  relationship_id: string;
  original_trade_id: string | null;
  copier_id: string;
  trader_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  pnl: number;
  commission: number;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  executed_at: string;
  created_at: string;
}

// Binance Earn
export type EarnProductType = 'flexible' | 'locked' | 'staking' | 'launchpool' | 'dual_investment';

export interface EarnPosition {
  id: string;
  user_id: string;
  product_type: EarnProductType;
  asset: string;
  amount: number;
  apy: number;
  daily_earnings: number;
  total_earnings: number;
  lock_period_days: number;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  status: 'active' | 'redeemed' | 'expired';
  source: string;
  created_at: string;
  updated_at: string;
}

export interface EarnHistoryEntry {
  id: string;
  user_id: string;
  position_id: string | null;
  action: 'subscribe' | 'redeem' | 'interest' | 'bonus';
  asset: string;
  amount: number;
  created_at: string;
}

// Gratitude
export interface GratitudeEntry {
  id: string;
  user_id: string;
  content: string;
  tagged_user_id: string | null;
  created_at: string;
}

// Breathing
export interface BreathSession {
  id: string;
  user_id: string;
  technique: '4-7-8' | 'box' | 'coherent' | 'wim_hof';
  duration_seconds: number;
  cycles: number;
  created_at: string;
}

// Golden Hour
export interface GoldenHour {
  id: string;
  started_at: string;
  ended_at: string | null;
  multiplier: number;
  total_points_distributed: number;
  created_at: string;
}

// Community Goal
export interface CommunityGoal {
  id: string;
  target_type: string;
  target_value: number;
  current_value: number;
  reward_points: number;
  achieved: boolean;
  deadline: string | null;
  created_at: string;
}

// Mentorship
export interface Mentorship {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: 'active' | 'completed' | 'paused';
  started_at: string;
  mentor?: { id: string; full_name: string | null; avatar_url: string | null; level: number; streak_days: number };
  mentee?: { id: string; full_name: string | null; avatar_url: string | null; level: number; streak_days: number };
}

// Challenge
export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_contact: string;
  challenged_user_id: string | null;
  type: string;
  target: number;
  status: 'pending' | 'active' | 'completed' | 'expired';
  winner_id: string | null;
  created_at: string;
}

// Review Prompt
export interface ReviewPrompt {
  id: string;
  user_id: string;
  triggered_by: string;
  response: 'accepted' | 'later' | 'never';
  points_given: number;
  shown_at: string;
}

export const SUPER_ADMIN_EMAIL = 'matiss.frasne@gmail.com';

export const PLAN_LIMITS: Record<Plan, {
  daily_questions: number;
  max_tokens: number;
  features: string[];
}> = {
  free: {
    daily_questions: 15,
    max_tokens: 2048,
    features: ['basic_chat', 'market_overview'],
  },
  pro: {
    daily_questions: 500,
    max_tokens: 8192,
    features: ['basic_chat', 'market_overview', 'alerts', 'portfolio_advanced', 'backtesting', 'signals'],
  },
  ultra: {
    daily_questions: 999999,
    max_tokens: 16384,
    features: ['basic_chat', 'market_overview', 'alerts', 'portfolio_advanced', 'backtesting', 'signals', 'api_access', 'custom_strategies'],
  },
};
