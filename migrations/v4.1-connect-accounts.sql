-- =============================================================================
-- MIDAS — V4.1 Stripe Connect Express (Embedded Components)
-- Table public.connect_accounts : 1 compte Stripe Connect par user Purama.
-- Idempotent. Appliqué via `docker exec -i supabase-db psql -U postgres -d postgres -f /dev/stdin`.
--
-- Architecture : Embedded Components (pas OAuth). AccountSession créée côté
-- serveur avec STRIPE_SECRET_KEY. User reste sur purama.dev (pas de redirect).
-- Voir STRIPE_CONNECT_KARMA_V4.md §Stripe Connect.
-- =============================================================================

BEGIN;

-- 1. Table principale --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.connect_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL DEFAULT 'FR',
  default_currency TEXT NOT NULL DEFAULT 'eur',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  kyc_verified_at TIMESTAMPTZ,
  disabled_reason TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes -----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_connect_accounts_stripe
  ON public.connect_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_connect_accounts_payouts
  ON public.connect_accounts(payouts_enabled) WHERE payouts_enabled = true;
CREATE INDEX IF NOT EXISTS idx_connect_accounts_pending
  ON public.connect_accounts(user_id)
  WHERE onboarding_completed = false;

-- 3. Trigger updated_at ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.connect_accounts_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connect_accounts_touch_updated_at_trg ON public.connect_accounts;
CREATE TRIGGER connect_accounts_touch_updated_at_trg
  BEFORE UPDATE ON public.connect_accounts
  FOR EACH ROW EXECUTE FUNCTION public.connect_accounts_touch_updated_at();

-- 4. RLS ---------------------------------------------------------------------

ALTER TABLE public.connect_accounts ENABLE ROW LEVEL SECURITY;

-- service_role = accès total (webhooks Stripe, API routes serveur)
DROP POLICY IF EXISTS connect_accounts_service_all ON public.connect_accounts;
CREATE POLICY connect_accounts_service_all ON public.connect_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User authentifié = lecture de son propre compte uniquement
DROP POLICY IF EXISTS connect_accounts_user_select ON public.connect_accounts;
CREATE POLICY connect_accounts_user_select ON public.connect_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Super admin = lecture globale (audit)
DROP POLICY IF EXISTS connect_accounts_admin_select ON public.connect_accounts;
CREATE POLICY connect_accounts_admin_select ON public.connect_accounts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 5. RPC idempotent pour upsert depuis le webhook Stripe account.updated ----

CREATE OR REPLACE FUNCTION public.upsert_connect_account(
  p_user_id UUID,
  p_stripe_account_id TEXT,
  p_details_submitted BOOLEAN,
  p_charges_enabled BOOLEAN,
  p_payouts_enabled BOOLEAN,
  p_disabled_reason TEXT,
  p_capabilities JSONB,
  p_requirements JSONB,
  p_country TEXT DEFAULT 'FR',
  p_default_currency TEXT DEFAULT 'eur'
) RETURNS public.connect_accounts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row public.connect_accounts;
  v_onboarding_completed BOOLEAN := p_details_submitted AND p_payouts_enabled;
  v_kyc_verified_at TIMESTAMPTZ := CASE
    WHEN p_details_submitted AND p_payouts_enabled THEN now()
    ELSE NULL
  END;
BEGIN
  INSERT INTO public.connect_accounts (
    user_id, stripe_account_id, country, default_currency,
    onboarding_completed, details_submitted, charges_enabled,
    payouts_enabled, kyc_verified_at, disabled_reason,
    capabilities, requirements, last_synced_at
  ) VALUES (
    p_user_id, p_stripe_account_id, p_country, p_default_currency,
    v_onboarding_completed, p_details_submitted, p_charges_enabled,
    p_payouts_enabled, v_kyc_verified_at, p_disabled_reason,
    COALESCE(p_capabilities, '{}'::jsonb), COALESCE(p_requirements, '{}'::jsonb),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_account_id    = EXCLUDED.stripe_account_id,
    details_submitted    = EXCLUDED.details_submitted,
    charges_enabled      = EXCLUDED.charges_enabled,
    payouts_enabled      = EXCLUDED.payouts_enabled,
    onboarding_completed = EXCLUDED.onboarding_completed,
    kyc_verified_at      = COALESCE(public.connect_accounts.kyc_verified_at, EXCLUDED.kyc_verified_at),
    disabled_reason      = EXCLUDED.disabled_reason,
    capabilities         = EXCLUDED.capabilities,
    requirements         = EXCLUDED.requirements,
    last_synced_at       = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_connect_account(
  UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, JSONB, JSONB, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_connect_account(
  UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, JSONB, JSONB, TEXT, TEXT
) TO service_role;

COMMIT;
