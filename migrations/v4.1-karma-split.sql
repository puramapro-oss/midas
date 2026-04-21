-- =============================================================================
-- MIDAS — V4.1 Axe 2 : Karma Split 50/10/10/30
--
-- Split automatique des abos Stripe (invoice.paid) sur 4 pools :
--   - reward (50%) : pool gains users (missions + tirages + primes)
--   - adya   (10%) : budget marketing ADYA
--   - asso   (10%) : Association Purama (mécénat, convention prestation)
--   - sasu   (30%) : SASU Purama (marge, 0% IS ZFRR)
--
-- Idempotent via UNIQUE(stripe_invoice_id) sur karma_split_log.
-- Atomicité via RPC increment_pool_balance (update pool + insert tx).
--
-- Voir STRIPE_CONNECT_KARMA_V4.md §Flux économique global.
-- Appliqué via `docker exec -i supabase-db psql -U postgres -d postgres -f /dev/stdin`.
-- =============================================================================

BEGIN;

-- 1. Étendre pool_balances.pool_type à 5 valeurs -----------------------------

ALTER TABLE midas.pool_balances
  DROP CONSTRAINT IF EXISTS pool_balances_pool_type_check;
ALTER TABLE midas.pool_balances
  ADD CONSTRAINT pool_balances_pool_type_check
  CHECK (pool_type IN ('reward', 'asso', 'partner', 'adya', 'sasu'));

-- Seed les 2 nouveaux pools
INSERT INTO midas.pool_balances (pool_type) VALUES ('adya'), ('sasu')
ON CONFLICT (pool_type) DO NOTHING;

-- 2. karma_split_log — idempotence stricte par invoice ----------------------

CREATE TABLE IF NOT EXISTS midas.karma_split_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  user_id UUID,
  amount_eur_gross NUMERIC(12,2) NOT NULL,
  split_reward_eur NUMERIC(12,2) NOT NULL,
  split_adya_eur NUMERIC(12,2) NOT NULL,
  split_asso_eur NUMERIC(12,2) NOT NULL,
  split_sasu_eur NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'skipped', 'failed')),
  skip_reason TEXT,
  error TEXT,
  pool_tx_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_karma_split_log_user
  ON midas.karma_split_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_karma_split_log_status
  ON midas.karma_split_log(status);

ALTER TABLE midas.karma_split_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS karma_split_log_service_all ON midas.karma_split_log;
CREATE POLICY karma_split_log_service_all ON midas.karma_split_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS karma_split_log_admin_select ON midas.karma_split_log;
CREATE POLICY karma_split_log_admin_select ON midas.karma_split_log
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 3. cpa_earnings — tracking CPA encaissés (finance les primes) -------------

CREATE TABLE IF NOT EXISTS midas.cpa_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  app_id TEXT NOT NULL DEFAULT 'midas',
  partner TEXT NOT NULL,
  amount_eur NUMERIC(12,2) NOT NULL CHECK (amount_eur >= 0),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  covers_prime_palier INTEGER CHECK (covers_prime_palier IN (1, 2, 3)),
  external_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpa_earnings_user
  ON midas.cpa_earnings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpa_earnings_partner
  ON midas.cpa_earnings(partner);
CREATE INDEX IF NOT EXISTS idx_cpa_earnings_received_at
  ON midas.cpa_earnings(received_at DESC);

ALTER TABLE midas.cpa_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cpa_earnings_service_all ON midas.cpa_earnings;
CREATE POLICY cpa_earnings_service_all ON midas.cpa_earnings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cpa_earnings_admin_select ON midas.cpa_earnings;
CREATE POLICY cpa_earnings_admin_select ON midas.cpa_earnings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. RPC increment_pool_balance — atomicité pool + transaction -------------
--
-- Met à jour pool_balances.balance + total_in (si direction='in')
-- ou total_out (si direction='out'), puis insère une ligne pool_transactions.
-- Retourne l'id de la pool_transaction pour traçabilité.
-- SECURITY DEFINER pour que le webhook (service_role) puisse l'appeler.

CREATE OR REPLACE FUNCTION midas.increment_pool_balance(
  p_pool_type TEXT,
  p_amount NUMERIC,
  p_direction TEXT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tx_id UUID;
BEGIN
  IF p_direction NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'invalid direction: %', p_direction;
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'invalid amount: %', p_amount;
  END IF;

  -- Update pool balance
  IF p_direction = 'in' THEN
    UPDATE midas.pool_balances
       SET balance    = balance + p_amount,
           total_in   = total_in + p_amount,
           updated_at = now()
     WHERE pool_type = p_pool_type;
  ELSE
    UPDATE midas.pool_balances
       SET balance    = balance - p_amount,
           total_out  = total_out + p_amount,
           updated_at = now()
     WHERE pool_type = p_pool_type;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown pool_type: %', p_pool_type;
  END IF;

  -- Insert ledger row
  INSERT INTO midas.pool_transactions (pool_type, amount, direction, reason, reference_id)
  VALUES (p_pool_type, p_amount, p_direction, p_reason, p_reference_id)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION midas.increment_pool_balance(TEXT, NUMERIC, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION midas.increment_pool_balance(TEXT, NUMERIC, TEXT, TEXT, UUID) TO service_role;

COMMIT;
