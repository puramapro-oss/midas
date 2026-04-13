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

-- Memoire IA (apprentissage continu) — aligné MIDAS-BRIEF-ULTIMATE.md
CREATE TABLE IF NOT EXISTS midas.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  market_condition TEXT,
  strategy_used TEXT,
  outcome TEXT CHECK (outcome IN ('win', 'loss')),
  confidence_delta INT DEFAULT 0,
  lessons TEXT,
  data JSONB DEFAULT '{}',
  -- Champs ajoutés par sql/midas-memory-migration.sql (brief)
  trade_id UUID,
  predicted_confidence DOUBLE PRECISION,
  actual_outcome TEXT,
  profit_pct DOUBLE PRECISION,
  strategy TEXT,
  pair TEXT,
  market_regime TEXT,
  indicators_snapshot JSONB DEFAULT '{}'::jsonb,
  lesson TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_memory_trade ON midas.ai_memory(trade_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_pair ON midas.ai_memory(pair);
CREATE INDEX IF NOT EXISTS idx_ai_memory_regime ON midas.ai_memory(market_regime);

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

-- Calibration IA — aligné MIDAS-BRIEF-ULTIMATE.md
CREATE TABLE IF NOT EXISTS midas.calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predicted_confidence INT,
  actual_outcome TEXT CHECK (actual_outcome IN ('win', 'loss')),
  strategy TEXT,
  pair TEXT,
  -- Champs ajoutés par sql/midas-memory-migration.sql (brief)
  predicted_range TEXT,
  actual_win_rate DOUBLE PRECISION,
  adjustment DOUBLE PRECISION DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
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

-- =============================================================================
-- PURAMA POINTS SYSTEM
-- =============================================================================

-- Add purama_points column to profiles if not exists
DO $$ BEGIN
  ALTER TABLE midas.profiles ADD COLUMN IF NOT EXISTS purama_points INT DEFAULT 0;
  ALTER TABLE midas.profiles ADD COLUMN IF NOT EXISTS purama_points_lifetime INT DEFAULT 0;
  ALTER TABLE midas.profiles ADD COLUMN IF NOT EXISTS streak_multiplier DECIMAL(3,1) DEFAULT 1.0;
  ALTER TABLE midas.profiles ADD COLUMN IF NOT EXISTS last_daily_gift TIMESTAMPTZ;
  ALTER TABLE midas.profiles ADD COLUMN IF NOT EXISTS daily_gift_streak INT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS midas.purama_points (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INT DEFAULT 0,
  lifetime_earned INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.purama_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS purama_points_own ON midas.purama_points FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'convert')),
  source TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_tx_user ON midas.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_tx_created ON midas.point_transactions(created_at);
ALTER TABLE midas.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS point_tx_own ON midas.point_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.point_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('reduction', 'subscription', 'ticket', 'feature', 'cash')),
  name TEXT NOT NULL,
  description TEXT,
  cost_points INT NOT NULL CHECK (cost_points > 0),
  value TEXT,
  is_active BOOLEAN DEFAULT true,
  max_purchases INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.point_shop_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shop_items_read ON midas.point_shop_items;
CREATE POLICY shop_items_read ON midas.point_shop_items FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.point_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES midas.point_shop_items(id),
  points_spent INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_purchases_user ON midas.point_purchases(user_id);
ALTER TABLE midas.point_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS point_purchases_own ON midas.point_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.point_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_reached INT NOT NULL,
  amount_converted DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.point_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS point_milestones_own ON midas.point_milestones FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- DAILY GIFT
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.daily_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_type TEXT NOT NULL CHECK (gift_type IN ('points', 'coupon', 'ticket', 'credits', 'big_points', 'mega_coupon')),
  gift_value TEXT NOT NULL,
  streak_count INT DEFAULT 0,
  opened_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_gifts_user ON midas.daily_gifts(user_id);
ALTER TABLE midas.daily_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS daily_gifts_own ON midas.daily_gifts FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- ACHIEVEMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('trading', 'social', 'learning', 'streak', 'milestone')),
  points_reward INT DEFAULT 100,
  xp_reward INT DEFAULT 50,
  condition_type TEXT NOT NULL,
  condition_value INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS achievements_read ON midas.achievements;
CREATE POLICY achievements_read ON midas.achievements FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES midas.achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON midas.user_achievements(user_id);
ALTER TABLE midas.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS user_achievements_own ON midas.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Seed 15 achievements for MIDAS
INSERT INTO midas.achievements (key, name, description, icon, category, points_reward, xp_reward, condition_type, condition_value) VALUES
  ('first_trade', 'Premier Trade', 'Execute ton premier trade', 'Zap', 'trading', 100, 50, 'trades_count', 1),
  ('trader_10', 'Trader Actif', '10 trades executes', 'TrendingUp', 'trading', 200, 100, 'trades_count', 10),
  ('trader_100', 'Trader Expert', '100 trades executes', 'Award', 'trading', 500, 250, 'trades_count', 100),
  ('win_streak_5', 'Serie Gagnante', '5 trades gagnants consecutifs', 'Flame', 'trading', 300, 150, 'win_streak', 5),
  ('profit_100', 'Premier Bénéfice', '100 USDT de profit cumule', 'DollarSign', 'milestone', 200, 100, 'total_profit', 100),
  ('profit_1000', 'Trader Profitable', '1000 USDT de profit cumule', 'Gem', 'milestone', 500, 250, 'total_profit', 1000),
  ('referral_1', 'Ambassadeur', 'Parraine ton premier ami', 'Users', 'social', 200, 100, 'referrals_count', 1),
  ('referral_10', 'Influenceur', '10 filleuls actifs', 'Crown', 'social', 500, 250, 'referrals_count', 10),
  ('streak_7', 'Regulier', '7 jours de connexion consecutive', 'Calendar', 'streak', 150, 75, 'login_streak', 7),
  ('streak_30', 'Discipline', '30 jours de connexion consecutive', 'Shield', 'streak', 500, 250, 'login_streak', 30),
  ('first_bot', 'Automatise', 'Cree ton premier bot', 'Bot', 'learning', 150, 75, 'bots_count', 1),
  ('backtest_master', 'Backtesteur', 'Lance 10 backtests', 'FlaskConical', 'learning', 200, 100, 'backtests_count', 10),
  ('portfolio_diversified', 'Diversifie', '5 paires differentes tradees', 'PieChart', 'trading', 200, 100, 'unique_pairs', 5),
  ('community_active', 'Communaute', 'Participe au mur d amour', 'Heart', 'social', 100, 50, 'wall_posts', 1),
  ('mentor', 'Mentor', 'Aide 3 traders debutants', 'GraduationCap', 'social', 500, 250, 'mentees_count', 3)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- COMMUNAUTÉ D'AMOUR
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.love_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  max_members INT DEFAULT 12 CHECK (max_members BETWEEN 5 AND 12),
  current_members INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'full', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.love_circles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS love_circles_read ON midas.love_circles;
CREATE POLICY love_circles_read ON midas.love_circles FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES midas.love_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'captain')),
  streak_days INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(circle_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_circle_members_user ON midas.circle_members(user_id);
ALTER TABLE midas.circle_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS circle_members_own ON midas.circle_members FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.buddies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_days INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  matched_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.buddies ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS buddies_own ON midas.buddies FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE IF NOT EXISTS midas.buddy_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_pair_id UUID NOT NULL REFERENCES midas.buddies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  mood_emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.buddy_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS buddy_checkins_own ON midas.buddy_checkins FOR SELECT USING (auth.uid() = sender_id);

CREATE TABLE IF NOT EXISTS midas.love_wall_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('victory', 'encouragement', 'milestone', 'gratitude')),
  reactions_count INT DEFAULT 0,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_love_wall_user ON midas.love_wall_posts(user_id);
ALTER TABLE midas.love_wall_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS love_wall_read ON midas.love_wall_posts;
CREATE POLICY love_wall_read ON midas.love_wall_posts FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS love_wall_insert ON midas.love_wall_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.love_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES midas.love_wall_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE midas.love_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS love_reactions_read ON midas.love_reactions;
CREATE POLICY love_reactions_read ON midas.love_reactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS love_reactions_insert ON midas.love_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.love_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  target_value DECIMAL(20,2) NOT NULL,
  current_value DECIMAL(20,2) DEFAULT 0,
  reward_type TEXT DEFAULT 'points' CHECK (reward_type IN ('points', 'euros')),
  reward_value DECIMAL(12,2) NOT NULL,
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.love_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS love_missions_read ON midas.love_missions;
CREATE POLICY love_missions_read ON midas.love_missions FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.love_mission_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES midas.love_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_value DECIMAL(20,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.love_mission_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS love_mission_contrib_own ON midas.love_mission_contributions FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  started_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);
ALTER TABLE midas.mentorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS mentorships_own ON midas.mentorships FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE TABLE IF NOT EXISTS midas.mentor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id UUID NOT NULL REFERENCES midas.mentorships(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.mentor_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS mentor_messages_own ON midas.mentor_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM midas.mentorships m WHERE m.id = mentorship_id AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())));

CREATE TABLE IF NOT EXISTS midas.gratitude_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tagged_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.gratitude_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS gratitude_own ON midas.gratitude_entries FOR SELECT USING (auth.uid() = user_id OR auth.uid() = tagged_user_id);
CREATE POLICY IF NOT EXISTS gratitude_insert ON midas.gratitude_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.victory_ceremonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  highlights JSONB DEFAULT '[]',
  participants_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.victory_ceremonies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS victory_ceremonies_read ON midas.victory_ceremonies;
CREATE POLICY victory_ceremonies_read ON midas.victory_ceremonies FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.love_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  ai_suggested BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  gratitude_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.love_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS love_letters_own ON midas.love_letters FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- =============================================================================
-- VIRALITÉ
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_contact TEXT NOT NULL,
  challenged_user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  target INT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'expired')),
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS challenges_own ON midas.challenges FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = challenged_user_id);

CREATE TABLE IF NOT EXISTS midas.shareable_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('pnl', 'streak', 'achievement', 'rank', 'portfolio')),
  image_url TEXT,
  shared_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.shareable_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS shareable_cards_own ON midas.shareable_cards FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_code TEXT NOT NULL,
  platform_hint TEXT,
  points_given INT DEFAULT 0,
  shared_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_social_shares_user ON midas.social_shares(user_id);
ALTER TABLE midas.social_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS social_shares_own ON midas.social_shares FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.share_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES midas.social_shares(id) ON DELETE CASCADE,
  new_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_points_given INT DEFAULT 0,
  converted_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.share_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS share_conversions_own ON midas.share_conversions FOR SELECT USING (auth.uid() = new_user_id);

CREATE TABLE IF NOT EXISTS midas.share_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  shares_required INT NOT NULL,
  shares_done INT DEFAULT 0,
  unlocked BOOLEAN DEFAULT false,
  UNIQUE(user_id, feature_key)
);
ALTER TABLE midas.share_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS share_unlocks_own ON midas.share_unlocks FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.community_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_value DECIMAL(20,2) NOT NULL,
  current_value DECIMAL(20,2) DEFAULT 0,
  reward_points INT NOT NULL,
  achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.community_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_goals_read ON midas.community_goals;
CREATE POLICY community_goals_read ON midas.community_goals FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.golden_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  multiplier DECIMAL(3,1) DEFAULT 3.0,
  total_points_distributed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.golden_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS golden_hours_read ON midas.golden_hours;
CREATE POLICY golden_hours_read ON midas.golden_hours FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('birthday', 'signup_anniversary')),
  event_date DATE NOT NULL,
  UNIQUE(user_id, event_type)
);
ALTER TABLE midas.user_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS user_events_own ON midas.user_events FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- LOTTERY / TIRAGE
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.lottery_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_date TIMESTAMPTZ NOT NULL,
  pool_amount DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.lottery_draws ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lottery_draws_read ON midas.lottery_draws;
CREATE POLICY lottery_draws_read ON midas.lottery_draws FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.lottery_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draw_id UUID REFERENCES midas.lottery_draws(id),
  source TEXT NOT NULL CHECK (source IN ('inscription', 'parrainage', 'mission', 'partage', 'note', 'challenge', 'streak', 'abo', 'achat_points')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_user ON midas.lottery_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_draw ON midas.lottery_tickets(draw_id);
ALTER TABLE midas.lottery_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS lottery_tickets_own ON midas.lottery_tickets FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.lottery_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES midas.lottery_draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES midas.lottery_tickets(id),
  rank INT NOT NULL,
  amount_won DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.lottery_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS lottery_winners_own ON midas.lottery_winners FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- NOTIFICATIONS IA ADAPTATIVES
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_hour INT DEFAULT 10 CHECK (preferred_hour BETWEEN 0 AND 23),
  preferred_days INT[] DEFAULT ARRAY[1,2,3,4,5],
  engagement_score INT DEFAULT 50,
  avg_open_rate DECIMAL(5,2) DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT now(),
  notification_style TEXT DEFAULT 'encouraging' CHECK (notification_style IN ('encouraging', 'informative', 'warm')),
  frequency TEXT DEFAULT 'normal' CHECK (frequency IN ('low', 'normal', 'high')),
  paused_until TIMESTAMPTZ,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  trading_signals BOOLEAN DEFAULT true,
  community_updates BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS notif_prefs_own ON midas.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS notif_prefs_update ON midas.notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS notif_prefs_insert ON midas.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS push_tokens_own ON midas.push_tokens FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.push_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened BOOLEAN DEFAULT false,
  engagement_score_at_send INT
);
CREATE INDEX IF NOT EXISTS idx_push_log_user ON midas.push_log(user_id);
ALTER TABLE midas.push_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS push_log_own ON midas.push_log FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- EMAILS AUTO
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_email_seq_user ON midas.email_sequences(user_id);
ALTER TABLE midas.email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS email_seq_own ON midas.email_sequences FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_templates_read ON midas.email_templates;
CREATE POLICY email_templates_read ON midas.email_templates FOR SELECT USING (true);

-- =============================================================================
-- PRICING POPUPS
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.pricing_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('limit', 'gains', 'premium', 'third_login')),
  action TEXT DEFAULT 'shown' CHECK (action IN ('shown', 'converted', 'later', 'dismissed')),
  shown_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pricing_popups_user ON midas.pricing_popups(user_id);
ALTER TABLE midas.pricing_popups ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS pricing_popups_own ON midas.pricing_popups FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- POOL SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.pool_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_type TEXT UNIQUE NOT NULL CHECK (pool_type IN ('reward', 'asso', 'partner')),
  balance DECIMAL(12,2) DEFAULT 0,
  total_in DECIMAL(12,2) DEFAULT 0,
  total_out DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.pool_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pool_balances_read ON midas.pool_balances;
CREATE POLICY pool_balances_read ON midas.pool_balances FOR SELECT USING (true);

-- Seed pools
INSERT INTO midas.pool_balances (pool_type) VALUES ('reward'), ('asso'), ('partner')
ON CONFLICT (pool_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS midas.pool_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_type TEXT NOT NULL REFERENCES midas.pool_balances(pool_type),
  amount DECIMAL(12,2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.pool_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pool_tx_read ON midas.pool_transactions;
CREATE POLICY pool_tx_read ON midas.pool_transactions FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('stripe_ca', 'aide_sasu', 'aide_asso', 'partner_deposit')),
  amount DECIMAL(12,2) NOT NULL,
  source_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.funding_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS funding_sources_read ON midas.funding_sources;
CREATE POLICY funding_sources_read ON midas.funding_sources FOR SELECT USING (true);

-- =============================================================================
-- CROSS-PROMO
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.cross_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_app TEXT NOT NULL DEFAULT 'midas',
  target_app TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_code TEXT,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.cross_promos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cross_promos_read ON midas.cross_promos;
CREATE POLICY cross_promos_read ON midas.cross_promos FOR SELECT USING (true);

-- =============================================================================
-- FAQ / HELP
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.faq_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  search_keywords TEXT[],
  view_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.faq_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS faq_articles_read ON midas.faq_articles;
CREATE POLICY faq_articles_read ON midas.faq_articles FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.help_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  results_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.help_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS help_searches_insert ON midas.help_searches;
CREATE POLICY help_searches_insert ON midas.help_searches FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS midas.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  responded BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contact_messages_insert ON midas.contact_messages;
CREATE POLICY contact_messages_insert ON midas.contact_messages FOR INSERT WITH CHECK (true);

-- =============================================================================
-- REVIEW + FEEDBACK
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.review_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL,
  response TEXT CHECK (response IN ('accepted', 'later', 'never')),
  points_given INT DEFAULT 0,
  shown_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.review_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS review_prompts_own ON midas.review_prompts FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS midas.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  category TEXT,
  points_given INT DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS user_feedback_own ON midas.user_feedback FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- STORY SHARES
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.story_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('streak', 'palier', 'mission', 'gains', 'classement', 'achievement')),
  image_url TEXT,
  shared_to TEXT,
  points_given INT DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.story_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS story_shares_own ON midas.story_shares FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- USER COUPONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  source TEXT NOT NULL CHECK (source IN ('parrainage', 'daily', 'email', 'points', 'event')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON midas.user_coupons(user_id);
ALTER TABLE midas.user_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS user_coupons_own ON midas.user_coupons FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- PENDING EARNINGS (for free users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.pending_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  source TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.pending_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS pending_earnings_own ON midas.pending_earnings FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- COLLABORATIVE MISSIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS midas.collaborative_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  required_participants INT NOT NULL,
  individual_target DECIMAL(20,2) NOT NULL,
  reward_type TEXT DEFAULT 'points',
  reward_value INT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE midas.collaborative_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS collab_missions_read ON midas.collaborative_missions;
CREATE POLICY collab_missions_read ON midas.collaborative_missions FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS midas.collaborative_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES midas.collaborative_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress DECIMAL(20,2) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mission_id, user_id)
);
ALTER TABLE midas.collaborative_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS collab_members_own ON midas.collaborative_members FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- Update service role policies for new tables
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'point_transactions', 'point_shop_items', 'point_purchases', 'point_milestones',
      'daily_gifts', 'achievements', 'user_achievements',
      'love_circles', 'circle_members', 'buddies', 'buddy_checkins',
      'love_wall_posts', 'love_reactions', 'love_missions', 'love_mission_contributions',
      'mentorships', 'mentor_messages', 'gratitude_entries', 'victory_ceremonies',
      'love_letters', 'challenges', 'shareable_cards', 'social_shares',
      'share_conversions', 'share_unlocks', 'community_goals', 'golden_hours',
      'user_events', 'lottery_draws', 'lottery_tickets', 'lottery_winners',
      'notification_preferences', 'push_tokens', 'push_log',
      'email_sequences', 'email_templates', 'pricing_popups',
      'pool_balances', 'pool_transactions', 'funding_sources',
      'cross_promos', 'faq_articles', 'help_searches', 'contact_messages',
      'review_prompts', 'user_feedback', 'story_shares', 'user_coupons',
      'pending_earnings', 'collaborative_missions', 'collaborative_members'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_service_all ON midas.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_service_all ON midas.%I FOR ALL USING (auth.role() = ''service_role'')', tbl, tbl);
  END LOOP;
END$$;

-- Grant permissions to PostgREST roles
GRANT USAGE ON SCHEMA midas TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA midas TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA midas TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA midas GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA midas GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Expose midas schema via PostgREST
-- This requires updating the supabase config to include 'midas' in exposed schemas
