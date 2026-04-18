-- =============================================================================
-- MIDAS — V7 Partnership V4 — RPC increment_referral_commission_total
-- Appelée par dispatchCommissionsFromStripeInvoice pour accumuler le total
-- commission gagnée sur un partner_referral (reporting dashboard filleuls).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_referral_commission_total(
  p_referral_id UUID,
  p_amount NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE partner_referrals
  SET
    total_commission_earned = COALESCE(total_commission_earned, 0) + p_amount,
    updated_at = now()
  WHERE id = p_referral_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_referral_commission_total(UUID, NUMERIC) TO service_role;

COMMIT;
