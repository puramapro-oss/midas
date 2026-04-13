-- =============================================================================
-- MIDAS — Partnership Tables
-- =============================================================================

-- Partners main table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('influencer', 'website', 'media', 'physical')),
  code TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  website_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'banned')),
  total_scans INTEGER DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  total_earned NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'legend')),
  milestone_reached INTEGER DEFAULT 0,
  iban TEXT,
  payout_threshold NUMERIC(8,2) DEFAULT 50,
  level2_partner_id UUID REFERENCES partners(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_code ON partners(code);
CREATE INDEX IF NOT EXISTS idx_partners_slug ON partners(slug);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);

-- Partner scans (QR/NFC)
CREATE TABLE IF NOT EXISTS partner_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device TEXT,
  os TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  referrer_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_scans_partner_id ON partner_scans(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_scans_code ON partner_scans(code);
CREATE INDEX IF NOT EXISTS idx_partner_scans_ip ON partner_scans(ip_address);
CREATE INDEX IF NOT EXISTS idx_partner_scans_created ON partner_scans(created_at);

-- Partner referrals
CREATE TABLE IF NOT EXISTS partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'churned')),
  first_payment_at TIMESTAMPTZ,
  total_commission_earned NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_user ON partner_referrals(referred_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_referrals_unique ON partner_referrals(partner_id, referred_user_id);

-- Partner commissions
CREATE TABLE IF NOT EXISTS partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES partner_referrals(id),
  type TEXT NOT NULL CHECK (type IN ('first_month', 'recurring', 'level2')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  stripe_payment_id TEXT,
  description TEXT,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status ON partner_commissions(status);

-- Partner milestones
CREATE TABLE IF NOT EXISTS partner_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  milestone_referrals INTEGER NOT NULL,
  bonus_amount NUMERIC(12,2) NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT now(),
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_milestones_partner ON partner_milestones(partner_id);

-- Partner payouts
CREATE TABLE IF NOT EXISTS partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  iban TEXT,
  reference TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner ON partner_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_status ON partner_payouts(status);

-- Partner coach messages (AI)
CREATE TABLE IF NOT EXISTS partner_coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_coach_partner ON partner_coach_messages(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_coach_created ON partner_coach_messages(created_at);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_coach_messages ENABLE ROW LEVEL SECURITY;

-- Partners: own data + super admin
DROP POLICY IF EXISTS partners_select_own ON partners;
CREATE POLICY partners_select_own ON partners FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS partners_insert_own ON partners;
CREATE POLICY partners_insert_own ON partners FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS partners_update_own ON partners;
CREATE POLICY partners_update_own ON partners FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Partner scans: partner owner + super admin (public insert via service role)
DROP POLICY IF EXISTS partner_scans_select ON partner_scans;
CREATE POLICY partner_scans_select ON partner_scans FOR SELECT USING (
  EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_scans.partner_id AND partners.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Partner referrals: partner owner + super admin
DROP POLICY IF EXISTS partner_referrals_select ON partner_referrals;
CREATE POLICY partner_referrals_select ON partner_referrals FOR SELECT USING (
  EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_referrals.partner_id AND partners.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Partner commissions: partner owner + super admin
DROP POLICY IF EXISTS partner_commissions_select ON partner_commissions;
CREATE POLICY partner_commissions_select ON partner_commissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_commissions.partner_id AND partners.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Partner milestones: partner owner + super admin
DROP POLICY IF EXISTS partner_milestones_select ON partner_milestones;
CREATE POLICY partner_milestones_select ON partner_milestones FOR SELECT USING (
  EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_milestones.partner_id AND partners.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Partner payouts: partner owner + super admin
DROP POLICY IF EXISTS partner_payouts_select ON partner_payouts;
CREATE POLICY partner_payouts_select ON partner_payouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_payouts.partner_id AND partners.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS partner_payouts_insert ON partner_payouts;
CREATE POLICY partner_payouts_insert ON partner_payouts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_payouts.partner_id AND partners.user_id = auth.uid())
);

-- Partner coach messages: partner owner + super admin
DROP POLICY IF EXISTS partner_coach_select ON partner_coach_messages;
CREATE POLICY partner_coach_select ON partner_coach_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_coach_messages.partner_id AND partners.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS partner_coach_insert ON partner_coach_messages;
CREATE POLICY partner_coach_insert ON partner_coach_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_coach_messages.partner_id AND partners.user_id = auth.uid())
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_partner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS partners_updated_at ON partners;
CREATE TRIGGER partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_partner_updated_at();

DROP TRIGGER IF EXISTS partner_referrals_updated_at ON partner_referrals;
CREATE TRIGGER partner_referrals_updated_at BEFORE UPDATE ON partner_referrals FOR EACH ROW EXECUTE FUNCTION update_partner_updated_at();

DROP TRIGGER IF EXISTS partner_commissions_updated_at ON partner_commissions;
CREATE TRIGGER partner_commissions_updated_at BEFORE UPDATE ON partner_commissions FOR EACH ROW EXECUTE FUNCTION update_partner_updated_at();

DROP TRIGGER IF EXISTS partner_payouts_updated_at ON partner_payouts;
CREATE TRIGGER partner_payouts_updated_at BEFORE UPDATE ON partner_payouts FOR EACH ROW EXECUTE FUNCTION update_partner_updated_at();

-- Public select for partner profiles (for /p/[slug])
DROP POLICY IF EXISTS partners_public_select ON partners;
CREATE POLICY partners_public_select ON partners FOR SELECT USING (
  status = 'active'
);
