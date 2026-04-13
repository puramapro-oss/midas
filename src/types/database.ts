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
