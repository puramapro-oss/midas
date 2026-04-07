-- MIDAS Schema — All tables
-- Run via: docker exec -i supabase-db psql -U supabase_admin -d postgres

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS midas;

-- Profiles
CREATE TABLE IF NOT EXISTS midas.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'influencer')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'ultra')),
  billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'cancelled')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  daily_questions_used INT DEFAULT 0,
  daily_questions_limit INT DEFAULT 5,
  daily_trades_used INT DEFAULT 0,
  referral_code TEXT UNIQUE,
  wallet_balance DECIMAL(12,2) DEFAULT 0,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  streak INT DEFAULT 0,
  theme TEXT DEFAULT 'dark',
  paper_trading_until TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON midas.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON midas.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON midas.profiles(stripe_customer_id);

-- Signals IA
CREATE TABLE IF NOT EXISTS midas.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL', 'HOLD')),
  entry_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  risk_reward TEXT,
  confidence INT CHECK (confidence >= 0 AND confidence <= 100),
  timeframe TEXT,
  strategy TEXT,
  reasoning TEXT,
  agents_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signals_user ON midas.signals(user_id);
CREATE INDEX IF NOT EXISTS idx_signals_pair ON midas.signals(pair);
CREATE INDEX IF NOT EXISTS idx_signals_status ON midas.signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_created ON midas.signals(created_at);

-- =============================================================================
-- Trades executés (LIVE = public.trades depuis migration commit 5704dc9)
-- midas.trades est legacy, conservé pour rétro-compat mais l'app ne l'utilise plus.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id UUID,
  exchange_connection_id UUID,
  exchange TEXT,
  pair TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell', 'BUY', 'SELL')),
  type TEXT DEFAULT 'market',
  strategy TEXT,
  is_paper_trade BOOLEAN DEFAULT false,
  entry_price DECIMAL(20,8),
  current_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  quantity DECIMAL(20,8),
  quote_amount DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  trailing_stop DECIMAL(20,8),
  trailing_stop_activated BOOLEAN DEFAULT false,
  pnl DECIMAL(20,8),
  pnl_pct DECIMAL(10,4),
  fees DECIMAL(20,8) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  close_reason TEXT,
  result TEXT,
  composite_score DECIMAL(5,4),
  technical_score DECIMAL(5,4),
  sentiment_score DECIMAL(5,4),
  onchain_score DECIMAL(5,4),
  confidence DECIMAL(5,4),
  risk_reward_ratio DECIMAL(8,4),
  indicators_snapshot JSONB,
  agent_results JSONB,
  ai_reasoning TEXT,
  exchange_order_id TEXT,
  exchange_response JSONB,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_pair ON public.trades(pair);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_paper ON public.trades(is_paper_trade);
CREATE INDEX IF NOT EXISTS idx_trades_opened ON public.trades(opened_at);
CREATE INDEX IF NOT EXISTS idx_trades_created ON public.trades(created_at);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trades_user_select" ON public.trades;
CREATE POLICY "trades_user_select" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trades_user_insert" ON public.trades;
CREATE POLICY "trades_user_insert" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trades_user_update" ON public.trades;
CREATE POLICY "trades_user_update" ON public.trades
  FOR UPDATE USING (auth.uid() = user_id);

-- Legacy midas.trades (figée — ne plus utiliser, public.trades est la source)
CREATE TABLE IF NOT EXISTS midas.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES midas.signals(id),
  pair TEXT NOT NULL,
  direction TEXT,
  entry_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  quantity DECIMAL(20,8),
  pnl DECIMAL(20,8),
  pnl_percent DECIMAL(10,4),
  fees DECIMAL(20,8) DEFAULT 0,
  status TEXT DEFAULT 'open',
  exchange TEXT,
  exchange_order_id TEXT,
  is_paper BOOLEAN DEFAULT false,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Bot config par utilisateur
CREATE TABLE IF NOT EXISTS midas.bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  mode TEXT DEFAULT 'simple' CHECK (mode IN ('simple', 'expert')),
  risk_level TEXT DEFAULT 'modere' CHECK (risk_level IN ('prudent', 'modere', 'agressif')),
  strategy TEXT DEFAULT 'momentum',
  max_position_pct DECIMAL(5,2) DEFAULT 5,
  max_simultaneous INT DEFAULT 3,
  max_daily_drawdown_pct DECIMAL(5,2) DEFAULT 5,
  max_monthly_loss DECIMAL(12,2),
  min_confidence INT DEFAULT 70,
  min_risk_reward DECIMAL(5,2) DEFAULT 1.5,
  cooldown_minutes INT DEFAULT 30,
  allowed_pairs TEXT[] DEFAULT ARRAY['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
  paper_trading BOOLEAN DEFAULT true,
  paper_balance DECIMAL(12,2) DEFAULT 50000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bots individuels
CREATE TABLE IF NOT EXISTS midas.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strategy TEXT NOT NULL,
  pair TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  total_trades INT DEFAULT 0,
  winning_trades INT DEFAULT 0,
  total_pnl DECIMAL(20,8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bots_user ON midas.bots(user_id);

-- Performance tracking
CREATE TABLE IF NOT EXISTS midas.performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  trades_count INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  pnl_usdt DECIMAL(20,8) DEFAULT 0,
  pnl_percent DECIMAL(10,4) DEFAULT 0,
  max_drawdown DECIMAL(10,4) DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  sharpe_ratio DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_performance_user ON midas.performance(user_id);

-- Cles API exchanges (chiffrees AES-256)
CREATE TABLE IF NOT EXISTS midas.exchange_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read', 'trade'],
  is_valid BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_keys_user ON midas.exchange_keys(user_id);

-- Paper trades (simulation)
CREATE TABLE IF NOT EXISTS midas.paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES midas.signals(id),
  pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry_price DECIMAL(20,8) NOT NULL,
  current_price DECIMAL(20,8),
  quantity DECIMAL(20,8) NOT NULL,
  pnl_simulated DECIMAL(20,8) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paper_trades_user ON midas.paper_trades(user_id);

-- Alertes
CREATE TABLE IF NOT EXISTS midas.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('price', 'volume', 'signal', 'drawdown')),
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  value DECIMAL(20,8) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON midas.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON midas.alerts(is_active);

-- Memoire IA (apprentissage continu)
CREATE TABLE IF NOT EXISTS midas.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  market_condition TEXT,
  strategy_used TEXT,
  outcome TEXT CHECK (outcome IN ('win', 'loss')),
  confidence_delta INT DEFAULT 0,
  lessons TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Backtests
CREATE TABLE IF NOT EXISTS midas.backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  strategy TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  params JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backtests_user ON midas.backtests(user_id);

-- Chat IA trading
CREATE TABLE IF NOT EXISTS midas.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Nouvelle conversation',
  messages_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON midas.chat_conversations(user_id);

CREATE TABLE IF NOT EXISTS midas.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES midas.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON midas.chat_messages(conversation_id);

-- Payments
CREATE TABLE IF NOT EXISTS midas.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_id TEXT,
  stripe_invoice_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'eur',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  plan TEXT,
  billing_period TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON midas.payments(user_id);

-- Leaderboard
CREATE TABLE IF NOT EXISTS midas.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  win_rate DECIMAL(5,2) DEFAULT 0,
  total_pnl DECIMAL(20,8) DEFAULT 0,
  total_trades INT DEFAULT 0,
  sharpe_ratio DECIMAL(10,4) DEFAULT 0,
  max_drawdown DECIMAL(5,2) DEFAULT 0,
  rank INT,
  is_copyable BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copy relations
CREATE TABLE IF NOT EXISTS midas.copy_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allocation_pct DECIMAL(5,2) DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, leader_id)
);

-- Calibration IA
CREATE TABLE IF NOT EXISTS midas.calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predicted_confidence INT,
  actual_outcome TEXT CHECK (actual_outcome IN ('win', 'loss')),
  strategy TEXT,
  pair TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS midas.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON midas.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON midas.notifications(read);

-- Enable RLS on all tables
ALTER TABLE midas.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.exchange_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.copy_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users see only their own data
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'signals', 'trades', 'bot_config', 'bots',
      'performance', 'exchange_keys', 'paper_trades', 'alerts',
      'backtests', 'chat_conversations', 'payments',
      'leaderboard', 'copy_relations', 'notifications'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_user_select ON midas.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_user_select ON midas.%I FOR SELECT USING (auth.uid() = user_id)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_user_insert ON midas.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_user_insert ON midas.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_user_update ON midas.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_user_update ON midas.%I FOR UPDATE USING (auth.uid() = user_id)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_user_delete ON midas.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_user_delete ON midas.%I FOR DELETE USING (auth.uid() = user_id)', tbl, tbl);
  END LOOP;
END$$;

-- Chat messages: access via conversation ownership
DROP POLICY IF EXISTS chat_messages_user_select ON midas.chat_messages;
CREATE POLICY chat_messages_user_select ON midas.chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM midas.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS chat_messages_user_insert ON midas.chat_messages;
CREATE POLICY chat_messages_user_insert ON midas.chat_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM midas.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- AI memory and calibration: readable by all authenticated, writable by service role
DROP POLICY IF EXISTS ai_memory_read ON midas.ai_memory;
CREATE POLICY ai_memory_read ON midas.ai_memory FOR SELECT USING (true);
DROP POLICY IF EXISTS calibration_read ON midas.calibration;
CREATE POLICY calibration_read ON midas.calibration FOR SELECT USING (true);

-- Leaderboard: readable by all authenticated
DROP POLICY IF EXISTS leaderboard_public_read ON midas.leaderboard;
CREATE POLICY leaderboard_public_read ON midas.leaderboard FOR SELECT USING (true);

-- Service role bypass for crons and server operations
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'signals', 'trades', 'bot_config', 'bots',
      'performance', 'exchange_keys', 'paper_trades', 'alerts',
      'ai_memory', 'backtests', 'chat_conversations', 'chat_messages',
      'payments', 'leaderboard', 'copy_relations', 'calibration', 'notifications',
      'referrals', 'wallets', 'wallet_transactions', 'withdrawal_requests',
      'contests', 'contest_participations'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_service_all ON midas.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_service_all ON midas.%I FOR ALL USING (auth.role() = ''service_role'')', tbl, tbl);
  END LOOP;
END$$;

-- Referrals
CREATE TABLE IF NOT EXISTS midas.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded')),
  referrer_reward_pct DECIMAL(5,2) DEFAULT 50.00,
  recurring_pct DECIMAL(5,2) DEFAULT 10.00,
  referred_discount_pct DECIMAL(5,2) DEFAULT 50.00,
  first_payment_amount DECIMAL(12,2),
  total_earned DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON midas.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON midas.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON midas.referrals(referral_code);

ALTER TABLE midas.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY referrals_select ON midas.referrals FOR SELECT USING (
  auth.uid() = referrer_id OR auth.uid() = referred_id
);
CREATE POLICY referrals_insert ON midas.referrals FOR INSERT WITH CHECK (true);

-- Wallets
CREATE TABLE IF NOT EXISTS midas.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0 CHECK (balance >= 0),
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallets_own ON midas.wallets FOR SELECT USING (auth.uid() = user_id);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS midas.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  source TEXT NOT NULL CHECK (source IN ('referral', 'contest', 'withdrawal', 'manual')),
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON midas.wallet_transactions(user_id);
ALTER TABLE midas.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_tx_own ON midas.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS midas.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 5),
  iban TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON midas.withdrawal_requests(user_id);
ALTER TABLE midas.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY withdrawal_own ON midas.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY withdrawal_insert ON midas.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Contests
CREATE TABLE IF NOT EXISTS midas.contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  prize_pool DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  winners JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY contests_read ON midas.contests FOR SELECT USING (true);

-- Contest participations
CREATE TABLE IF NOT EXISTS midas.contest_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_id UUID NOT NULL REFERENCES midas.contests(id) ON DELETE CASCADE,
  tickets INT DEFAULT 1 CHECK (tickets >= 1),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contest_id)
);
CREATE INDEX IF NOT EXISTS idx_contest_part_contest ON midas.contest_participations(contest_id);
ALTER TABLE midas.contest_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY contest_part_own ON midas.contest_participations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY contest_part_insert ON midas.contest_participations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION midas.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO midas.profiles (id, email, referral_code, paper_trading_until)
  VALUES (
    NEW.id,
    NEW.email,
    'MIDAS-' || substr(md5(random()::text), 1, 8),
    now() + interval '7 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_midas ON auth.users;
CREATE TRIGGER on_auth_user_created_midas
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION midas.handle_new_user();

-- Ranking contests (monthly portfolio evaluation)
CREATE TABLE IF NOT EXISTS midas.ranking_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'evaluating', 'completed')),
  prize_pool DECIMAL(12,2) DEFAULT 0,
  total_participants INT DEFAULT 0,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year)
);
ALTER TABLE midas.ranking_contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ranking_contests_read ON midas.ranking_contests FOR SELECT USING (true);

-- Portfolio rankings (scores per user per month)
CREATE TABLE IF NOT EXISTS midas.portfolio_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ranking_contest_id UUID NOT NULL REFERENCES midas.ranking_contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudo TEXT NOT NULL,
  risk_score DECIMAL(5,2) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 30),
  regularity_score DECIMAL(5,2) DEFAULT 0 CHECK (regularity_score >= 0 AND regularity_score <= 25),
  preservation_score DECIMAL(5,2) DEFAULT 0 CHECK (preservation_score >= 0 AND preservation_score <= 25),
  loyalty_score DECIMAL(5,2) DEFAULT 0 CHECK (loyalty_score >= 0 AND loyalty_score <= 20),
  total_score DECIMAL(5,2) DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
  rank INT,
  prize_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ranking_contest_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ranking_contest ON midas.portfolio_rankings(ranking_contest_id);
CREATE INDEX IF NOT EXISTS idx_ranking_user ON midas.portfolio_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_ranking_total ON midas.portfolio_rankings(total_score DESC);
ALTER TABLE midas.portfolio_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ranking_read ON midas.portfolio_rankings FOR SELECT USING (true);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION midas.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated ON midas.profiles;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON midas.profiles
  FOR EACH ROW EXECUTE FUNCTION midas.update_timestamp();

DROP TRIGGER IF EXISTS bot_config_updated ON midas.bot_config;
CREATE TRIGGER bot_config_updated BEFORE UPDATE ON midas.bot_config
  FOR EACH ROW EXECUTE FUNCTION midas.update_timestamp();

-- Seed super admin
INSERT INTO midas.profiles (id, email, role, plan, daily_questions_limit, subscription_status)
SELECT id, 'matiss.frasne@gmail.com', 'super_admin', 'ultra', 999999, 'active'
FROM auth.users WHERE email = 'matiss.frasne@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  plan = 'ultra',
  daily_questions_limit = 999999,
  subscription_status = 'active';

-- Grant permissions to PostgREST roles
GRANT USAGE ON SCHEMA midas TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA midas TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA midas TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA midas GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA midas GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Expose midas schema via PostgREST
-- This requires updating the supabase config to include 'midas' in exposed schemas
