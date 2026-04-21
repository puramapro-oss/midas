-- =============================================================================
-- MIDAS — V4.1 Axe 2 : Karma Split 50/10/10/30
--
-- Split automatique des abos Stripe (invoice.paid) sur 4 pools :
--   - reward (50%) : pool gains users (missions + tirages + primes)
--   - adya   (10%) : budget marketing ADYA
--   - asso   (10%) : Association Purama (mécénat, convention prestation)
--   - sasu   (30%) : SASU Purama (marge, 0% IS ZFRR)
--
-- Idempotent via UNIQUE(stripe_invoice_id) sur public.karma_split_log.
-- Atomicité via RPC karma_split_apply (log + 4 pools en une seule transaction).
--
-- IMPORTANT — Schémas Purama :
--   PostgREST (via PGRST_DB_SCHEMAS=public) n'expose QUE le schéma `public`.
--   Les tables historiques (pool_balances, pool_transactions) sont dans
--   `midas` ; on les y laisse (compat admin/financement). Les nouveaux
--   objets (logs + RPC) sont créés dans `public` pour être appelables
--   depuis supabase-js sans `.schema('midas')`. Les RPCs écrivent dans
--   midas.* via SECURITY DEFINER (owner supabase_admin a les droits).
--
-- Voir STRIPE_CONNECT_KARMA_V4.md §Flux économique global.
-- Appliqué via `docker exec -i supabase-db psql -U supabase_admin ...`.
-- =============================================================================

BEGIN;

-- 0. Cleanup migration précédente (v4.1-karma-split.sql v1 avait créé dans midas)

DROP FUNCTION IF EXISTS midas.karma_split_apply(TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS midas.increment_pool_balance(TEXT, NUMERIC, TEXT, TEXT, UUID);
DROP TABLE IF EXISTS midas.karma_split_log;
DROP TABLE IF EXISTS midas.cpa_earnings;

-- 1. Étendre midas.pool_balances.pool_type à 5 valeurs -----------------------

ALTER TABLE midas.pool_balances
  DROP CONSTRAINT IF EXISTS pool_balances_pool_type_check;
ALTER TABLE midas.pool_balances
  ADD CONSTRAINT pool_balances_pool_type_check
  CHECK (pool_type IN ('reward', 'asso', 'partner', 'adya', 'sasu'));

-- Seed les 2 nouveaux pools
INSERT INTO midas.pool_balances (pool_type) VALUES ('adya'), ('sasu')
ON CONFLICT (pool_type) DO NOTHING;

-- 2. public.karma_split_log — idempotence stricte par invoice ---------------

CREATE TABLE IF NOT EXISTS public.karma_split_log (
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
  ON public.karma_split_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_karma_split_log_status
  ON public.karma_split_log(status);

ALTER TABLE public.karma_split_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS karma_split_log_service_all ON public.karma_split_log;
CREATE POLICY karma_split_log_service_all ON public.karma_split_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS karma_split_log_admin_select ON public.karma_split_log;
CREATE POLICY karma_split_log_admin_select ON public.karma_split_log
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 3. public.cpa_earnings — tracking CPA encaissés (finance les primes) ------

CREATE TABLE IF NOT EXISTS public.cpa_earnings (
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
  ON public.cpa_earnings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpa_earnings_partner
  ON public.cpa_earnings(partner);
CREATE INDEX IF NOT EXISTS idx_cpa_earnings_received_at
  ON public.cpa_earnings(received_at DESC);

ALTER TABLE public.cpa_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cpa_earnings_service_all ON public.cpa_earnings;
CREATE POLICY cpa_earnings_service_all ON public.cpa_earnings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cpa_earnings_admin_select ON public.cpa_earnings;
CREATE POLICY cpa_earnings_admin_select ON public.cpa_earnings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. RPC public.increment_pool_balance — atomicité pool + transaction -------
--
-- SECURITY DEFINER → exécutée avec les droits du owner (supabase_admin),
-- qui a accès aux tables midas.* pour le UPDATE/INSERT.
-- Appelée depuis karma_split_apply (qui agrège les 4 appels dans une seule
-- transaction plpgsql).

CREATE OR REPLACE FUNCTION public.increment_pool_balance(
  p_pool_type TEXT,
  p_amount NUMERIC,
  p_direction TEXT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = midas, public, pg_temp
AS $$
DECLARE
  v_tx_id UUID;
BEGIN
  IF p_direction NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'invalid direction: %', p_direction;
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'invalid amount: %', p_amount;
  END IF;

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

  INSERT INTO midas.pool_transactions (pool_type, amount, direction, reason, reference_id)
  VALUES (p_pool_type, p_amount, p_direction, p_reason, p_reference_id)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_pool_balance(TEXT, NUMERIC, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_pool_balance(TEXT, NUMERIC, TEXT, TEXT, UUID) TO service_role;

-- 5. RPC public.karma_split_apply — atomicité log + 4 pools -----------------
--
-- Appelée par le dispatcher Node (F4). Garantit que la création de la ligne
-- karma_split_log + les 4 increments de pools sont atomiques : si un pool
-- échoue, tout le bloc est annulé (rollback implicite plpgsql sur RAISE).
--
-- Idempotence : lookup préalable par stripe_invoice_id. Si déjà enregistré,
-- retourne la ligne existante avec already_processed=true. Si race condition,
-- UNIQUE violation → catch → return already_processed=true.

CREATE OR REPLACE FUNCTION public.karma_split_apply(
  p_stripe_invoice_id TEXT,
  p_stripe_customer_id TEXT,
  p_user_id UUID,
  p_amount_eur_gross NUMERIC,
  p_split_reward_eur NUMERIC,
  p_split_adya_eur NUMERIC,
  p_split_asso_eur NUMERIC,
  p_split_sasu_eur NUMERIC
) RETURNS TABLE(log_id UUID, pool_tx_ids UUID[], already_processed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = midas, public, pg_temp
AS $$
DECLARE
  v_existing_log_id UUID;
  v_log_id UUID;
  v_tx_ids UUID[] := ARRAY[]::UUID[];
  v_tx UUID;
BEGIN
  -- Fast path idempotence
  SELECT id INTO v_existing_log_id
    FROM public.karma_split_log
   WHERE stripe_invoice_id = p_stripe_invoice_id;

  IF v_existing_log_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_log_id, ARRAY[]::UUID[], true;
    RETURN;
  END IF;

  -- Insert log atomically with UNIQUE violation fallback
  BEGIN
    INSERT INTO public.karma_split_log (
      stripe_invoice_id, stripe_customer_id, user_id,
      amount_eur_gross, split_reward_eur, split_adya_eur,
      split_asso_eur, split_sasu_eur, status
    ) VALUES (
      p_stripe_invoice_id, p_stripe_customer_id, p_user_id,
      p_amount_eur_gross, p_split_reward_eur, p_split_adya_eur,
      p_split_asso_eur, p_split_sasu_eur, 'ok'
    )
    RETURNING id INTO v_log_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_log_id
      FROM public.karma_split_log
     WHERE stripe_invoice_id = p_stripe_invoice_id;
    RETURN QUERY SELECT v_log_id, ARRAY[]::UUID[], true;
    RETURN;
  END;

  -- 4 increments — un RAISE propage et rollback l'INSERT du log
  v_tx := public.increment_pool_balance('reward', p_split_reward_eur, 'in', 'karma_split', v_log_id);
  v_tx_ids := array_append(v_tx_ids, v_tx);
  v_tx := public.increment_pool_balance('adya', p_split_adya_eur, 'in', 'karma_split', v_log_id);
  v_tx_ids := array_append(v_tx_ids, v_tx);
  v_tx := public.increment_pool_balance('asso', p_split_asso_eur, 'in', 'karma_split', v_log_id);
  v_tx_ids := array_append(v_tx_ids, v_tx);
  v_tx := public.increment_pool_balance('sasu', p_split_sasu_eur, 'in', 'karma_split', v_log_id);
  v_tx_ids := array_append(v_tx_ids, v_tx);

  UPDATE public.karma_split_log
     SET pool_tx_ids = v_tx_ids
   WHERE id = v_log_id;

  RETURN QUERY SELECT v_log_id, v_tx_ids, false;
END;
$$;

REVOKE ALL ON FUNCTION public.karma_split_apply(TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.karma_split_apply(TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO service_role;

COMMIT;
