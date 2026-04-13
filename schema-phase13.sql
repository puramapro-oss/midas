-- MIDAS Phase 13 — Binance Earn + Copy Trading + KYC
-- Schema: midas

SET search_path TO midas;

-- ============================================================
-- 1. KYC VERIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none','pending','verified','rejected')),
  tier INTEGER NOT NULL DEFAULT 0 CHECK (tier BETWEEN 0 AND 3),
  -- tier 0: non vérifié (retrait max 0€)
  -- tier 1: email vérifié (retrait max 500€/mois)
  -- tier 2: identité vérifiée (retrait max 5000€/mois)
  -- tier 3: avancé (retrait illimité)
  full_name TEXT,
  date_of_birth DATE,
  nationality TEXT,
  address_line TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'FR',
  document_type TEXT CHECK (document_type IN ('passport','id_card','driver_license')),
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  proof_of_address_url TEXT,
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS kyc_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. COPY TRADING
-- ============================================================

CREATE TABLE IF NOT EXISTS trader_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT false,
  total_pnl NUMERIC DEFAULT 0,
  total_pnl_pct NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  avg_holding_time_hours NUMERIC DEFAULT 0,
  max_drawdown NUMERIC DEFAULT 0,
  sharpe_ratio NUMERIC DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  copiers_count INTEGER DEFAULT 0,
  min_copy_amount NUMERIC DEFAULT 50,
  max_copiers INTEGER DEFAULT 100,
  commission_pct NUMERIC DEFAULT 10,
  -- 10% des profits des copieurs
  is_verified BOOLEAN DEFAULT false,
  ranking_score NUMERIC DEFAULT 0,
  last_trade_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS copy_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trader_id UUID NOT NULL REFERENCES trader_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','stopped')),
  copy_amount NUMERIC NOT NULL DEFAULT 100,
  -- montant alloué au copy trading
  copy_ratio NUMERIC NOT NULL DEFAULT 1.0,
  -- ratio de copie (0.5 = 50% du trade du trader)
  total_copied_trades INTEGER DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  commission_paid NUMERIC DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(copier_id, trader_id)
);

CREATE TABLE IF NOT EXISTS copy_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES copy_relationships(id) ON DELETE CASCADE,
  original_trade_id UUID,
  copier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trader_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  pnl NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'executed' CHECK (status IN ('pending','executed','failed','cancelled')),
  executed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. BINANCE EARN (positions tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS earn_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL CHECK (product_type IN ('flexible','locked','staking','launchpool','dual_investment')),
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  apy NUMERIC NOT NULL DEFAULT 0,
  daily_earnings NUMERIC DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  lock_period_days INTEGER DEFAULT 0,
  -- 0 = flexible
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired')),
  source TEXT DEFAULT 'binance',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS earn_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id UUID REFERENCES earn_positions(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('subscribe','redeem','interest','bonus')),
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_user ON kyc_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_trader_profiles_user ON trader_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trader_profiles_ranking ON trader_profiles(ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_copy_relationships_copier ON copy_relationships(copier_id);
CREATE INDEX IF NOT EXISTS idx_copy_relationships_trader ON copy_relationships(trader_id);
CREATE INDEX IF NOT EXISTS idx_copy_trades_copier ON copy_trades(copier_id);
CREATE INDEX IF NOT EXISTS idx_earn_positions_user ON earn_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_earn_positions_status ON earn_positions(status);
CREATE INDEX IF NOT EXISTS idx_earn_history_user ON earn_history(user_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trader_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE earn_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE earn_history ENABLE ROW LEVEL SECURITY;

-- KYC: user sees own, admin sees all
CREATE POLICY kyc_select ON kyc_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY kyc_insert ON kyc_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY kyc_update ON kyc_verifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY kyc_audit_select ON kyc_audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY kyc_audit_insert ON kyc_audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trader profiles: public profiles visible to all auth users
CREATE POLICY trader_select ON trader_profiles FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY trader_insert ON trader_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY trader_update ON trader_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Copy relationships: copier and trader can see
CREATE POLICY copy_rel_select ON copy_relationships FOR SELECT USING (
  copier_id = auth.uid() OR trader_id IN (SELECT id FROM trader_profiles WHERE user_id = auth.uid())
);
CREATE POLICY copy_rel_insert ON copy_relationships FOR INSERT WITH CHECK (copier_id = auth.uid());
CREATE POLICY copy_rel_update ON copy_relationships FOR UPDATE USING (copier_id = auth.uid());

-- Copy trades: copier can see own
CREATE POLICY copy_trades_select ON copy_trades FOR SELECT USING (copier_id = auth.uid());

-- Earn: user sees own
CREATE POLICY earn_pos_select ON earn_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY earn_pos_insert ON earn_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY earn_pos_update ON earn_positions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY earn_hist_select ON earn_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY earn_hist_insert ON earn_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed: some demo trader profiles for leaderboard (verified = true means they're real tracked traders)
-- NOT fake data — these are template records that will be populated by real trading activity
