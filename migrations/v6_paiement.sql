-- =============================================================================
-- MIDAS — Migration V6 Paiement (2026-04-15)
-- Art. L221-28 3° — prime wallet 30j lock + résiliation 3 étapes
-- =============================================================================

-- 1. Flag subscription_started_at sur profiles (retrait conditionné 30j)
ALTER TABLE midas.profiles
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prime_total_credited DECIMAL(10,2) DEFAULT 0;

-- 2. Table subscriptions (suivi Stripe complet)
CREATE TABLE IF NOT EXISTS midas.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES midas.profiles(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'midas',
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','paused','cancelled','past_due','incomplete')),
  plan TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON midas.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_stripe ON midas.subscriptions(stripe_subscription_id);

-- 3. Table prime_tranches (3 paliers J+0 / M+1 / M+2)
CREATE TABLE IF NOT EXISTS midas.prime_tranches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES midas.profiles(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'midas',
  palier INT NOT NULL CHECK (palier IN (1,2,3)),
  amount DECIMAL(10,2) NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  credited_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','credited','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id, palier)
);
CREATE INDEX IF NOT EXISTS idx_prime_tranches_scheduled ON midas.prime_tranches(status, scheduled_for);

-- 4. Table retractions (Art. L221-28 — annulation <30j = prime déduite)
CREATE TABLE IF NOT EXISTS midas.retractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES midas.profiles(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL DEFAULT 'midas',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  amount_refunded DECIMAL(10,2),
  prime_deducted DECIMAL(10,2) DEFAULT 0,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

-- 5. RLS
ALTER TABLE midas.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.prime_tranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.retractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subs_user_read ON midas.subscriptions;
CREATE POLICY subs_user_read ON midas.subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS prime_user_read ON midas.prime_tranches;
CREATE POLICY prime_user_read ON midas.prime_tranches FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS retract_user_read ON midas.retractions;
CREATE POLICY retract_user_read ON midas.retractions FOR SELECT USING (auth.uid() = user_id);

-- 6. Helper RPC — incrémenter affirmations_seen (utilisé par lib/awakening.ts)
CREATE OR REPLACE FUNCTION midas.increment_affirmations_seen(uid UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE midas.profiles
  SET affirmations_seen = COALESCE(affirmations_seen, 0) + 1
  WHERE id = uid;
END;
$$;
