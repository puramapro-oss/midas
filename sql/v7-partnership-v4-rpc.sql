-- =============================================================================
-- MIDAS — V7 Partnership V4 — RPC increment_partner_balance
-- Appelée par commission-engine.ts pour incrementer current_balance et
-- total_earned sur partners, atomiquement.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_partner_balance(
  p_partner_id UUID,
  p_amount NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE partners
  SET
    current_balance = COALESCE(current_balance, 0) + p_amount,
    total_earned    = COALESCE(total_earned, 0) + p_amount,
    updated_at      = now()
  WHERE id = p_partner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_partner_balance(UUID, NUMERIC) TO service_role;

COMMIT;
