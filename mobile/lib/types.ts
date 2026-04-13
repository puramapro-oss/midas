export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar: string | null;
  role: "user" | "admin" | "super_admin" | "influencer";
  plan: "free" | "starter" | "pro" | "unlimited" | "enterprise";
  credits: number;
  daily_questions: number;
  referral_code: string | null;
  wallet_balance: number;
  tier: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  xp: number;
  level: number;
  streak: number;
  theme: "dark" | "oled" | "light";
  notifs: boolean;
  tutorial_completed: boolean;
  purama_points: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Signal {
  id: string;
  pair: string;
  direction: "long" | "short";
  confidence: number;
  entry_price: number;
  take_profit: number;
  stop_loss: number;
  timeframe: string;
  status: "active" | "triggered" | "expired" | "cancelled";
  created_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  pair: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  amount: number;
  pnl: number | null;
  fee: number;
  status: "open" | "closed" | "cancelled";
  is_paper_trade: boolean;
  created_at: string;
  closed_at: string | null;
}

export interface Bot {
  id: string;
  name: string;
  strategy: string;
  pair: string;
  is_active: boolean;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  created_at: string;
}

export interface Alert {
  id: string;
  pair: string;
  condition: "above" | "below" | "change_pct";
  value: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  market_cap: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

export interface LotteryDraw {
  id: string;
  draw_date: string;
  pool_amount: number;
  status: "upcoming" | "live" | "completed";
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost_points: number;
  category: string;
  type: string;
}
