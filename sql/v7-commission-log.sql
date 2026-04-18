-- =============================================================================
-- MIDAS — V7 Partnership V4 — Commission Dispatch Log
-- Idempotence + audit pour chaque tentative de dispatch via webhook Stripe
-- invoice.paid. UNIQUE(stripe_invoice_id) garantit qu'un même event Stripe
-- (potentiellement re-livré) ne produit jamais 2 commissions.
-- Service_role only — table technique, pas exposée user.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.commission_dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  amount_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_first_payment BOOLEAN NOT NULL DEFAULT false,
  commission_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  status TEXT NOT NULL CHECK (status IN ('ok', 'skipped', 'failed')),
  skip_reason TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_log_invoice
  ON public.commission_dispatch_log(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_commission_log_user
  ON public.commission_dispatch_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commission_log_partner
  ON public.commission_dispatch_log(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commission_log_status_date
  ON public.commission_dispatch_log(status, created_at DESC);

ALTER TABLE public.commission_dispatch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commission_log_service_all ON public.commission_dispatch_log;
CREATE POLICY commission_log_service_all ON public.commission_dispatch_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Super admin lecture (audit / debug depuis dashboard)
DROP POLICY IF EXISTS commission_log_admin_select ON public.commission_dispatch_log;
CREATE POLICY commission_log_admin_select ON public.commission_dispatch_log
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

COMMIT;
