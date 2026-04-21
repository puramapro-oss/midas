-- =============================================================================
-- MIDAS — V4.1 Axe 3 : Stripe Connect Withdrawals
--
-- Retrait wallet via Stripe Connect Express (Transfers API) vers le compte
-- connecté de l'user. Seuil min 20€ (brief STRIPE_CONNECT_KARMA_V4.md §frais).
--
-- Idempotent via UNIQUE(stripe_transfer_id). Atomicité débit wallet via RPC
-- debit_wallet_for_withdrawal (SELECT FOR UPDATE → CHECK balance → UPDATE).
--
-- Table PUBLIC (exposée PostgREST), écritures profiles via SECURITY DEFINER.
-- Voir STRIPE_CONNECT_KARMA_V4.md §Grille frais user.
-- =============================================================================

BEGIN;

-- 1. public.connect_withdrawals ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.connect_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  stripe_transfer_id TEXT UNIQUE,
  amount_eur NUMERIC(12,2) NOT NULL CHECK (amount_eur >= 20),
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'reversed')),
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_connect_withdrawals_user
  ON public.connect_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_connect_withdrawals_status
  ON public.connect_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_connect_withdrawals_created
  ON public.connect_withdrawals(created_at DESC);

ALTER TABLE public.connect_withdrawals ENABLE ROW LEVEL SECURITY;

-- Service role : CRUD total (API route POST + webhook status updates)
DROP POLICY IF EXISTS connect_withdrawals_service_all ON public.connect_withdrawals;
CREATE POLICY connect_withdrawals_service_all ON public.connect_withdrawals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User authentifié : lecture de ses propres retraits uniquement
DROP POLICY IF EXISTS connect_withdrawals_user_select ON public.connect_withdrawals;
CREATE POLICY connect_withdrawals_user_select ON public.connect_withdrawals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Super admin : lecture globale (audit finance)
DROP POLICY IF EXISTS connect_withdrawals_admin_select ON public.connect_withdrawals;
CREATE POLICY connect_withdrawals_admin_select ON public.connect_withdrawals
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 2. RPC debit_wallet_for_withdrawal — atomique + safe ---------------------
--
-- SELECT FOR UPDATE → CHECK balance >= amount → UPDATE. Si balance
-- insuffisante, RAISE EXCEPTION avec message typé 'insufficient_balance' que
-- l'API route catch pour retourner 400 au client.
-- Retourne le nouveau solde pour affichage immédiat côté UI.

CREATE OR REPLACE FUNCTION public.debit_wallet_for_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = midas, public, pg_temp
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: %', p_amount;
  END IF;

  -- Lock de la ligne profile le temps de la transaction
  -- midas.profiles : source de vérité wallet_balance (voir existing RPC
  -- public.increment_wallet_balance qui cible aussi midas.profiles)
  SELECT wallet_balance INTO v_current_balance
    FROM midas.profiles
   WHERE id = p_user_id
   FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance: current=% requested=%',
      v_current_balance, p_amount;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE midas.profiles
     SET wallet_balance = v_new_balance,
         updated_at = now()
   WHERE id = p_user_id;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_wallet_for_withdrawal(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debit_wallet_for_withdrawal(UUID, NUMERIC) TO service_role;

-- 3. RPC credit_wallet_on_withdrawal_failure --------------------------------
--
-- Appelée par le webhook transfer.failed / transfer.reversed pour reverser
-- le débit sur le wallet. Symétrique mais sans check balance (puisqu'on remet).

CREATE OR REPLACE FUNCTION public.credit_wallet_on_withdrawal_failure(
  p_user_id UUID,
  p_amount NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = midas, public, pg_temp
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: %', p_amount;
  END IF;

  UPDATE midas.profiles
     SET wallet_balance = wallet_balance + p_amount,
         updated_at = now()
   WHERE id = p_user_id
   RETURNING wallet_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_on_withdrawal_failure(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_wallet_on_withdrawal_failure(UUID, NUMERIC) TO service_role;

-- 4. RPC get_wallet_balance — lecture wallet (midas non exposé REST) --------
--
-- PGRST_DB_SCHEMAS=public ne permet pas de lire midas.profiles directement
-- via supabase-js. Cette RPC comble le besoin lecture-seule pour les API
-- routes qui doivent afficher le solde sans écrire.

CREATE OR REPLACE FUNCTION public.get_wallet_balance(
  p_user_id UUID
) RETURNS NUMERIC
LANGUAGE sql SECURITY DEFINER
SET search_path = midas, public, pg_temp
AS $$
  SELECT COALESCE(wallet_balance, 0)::NUMERIC
    FROM midas.profiles
   WHERE id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_wallet_balance(UUID) FROM PUBLIC;
-- Uniquement service_role : force passage par une API route serveur qui
-- vérifie auth.uid() = p_user_id (sinon un client authenticated pourrait
-- appeler la RPC avec n'importe quel UUID).
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(UUID) TO service_role;

COMMIT;
