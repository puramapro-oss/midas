-- =============================================================================
-- Migration 008 : Durcissement sécurité (audit final 2026-09-18)
-- H1 : un user authentifié peut s'auto-upgrader `plan`/`stripe_*` via
--      PostgREST (politique FOR ALL sur sa propre ligne public.profiles).
-- H4 : RLS absente sur public.admin_stats / referrals / learning_logs
--      (tables créées dans 001 sans ENABLE ROW LEVEL SECURITY).
-- L2 : grants anon superflus sur midas.exchange_connections.
-- C1 (complément) : RPC exec_sql orphelin depuis la fermeture de /api/setup.
-- Idempotent : chaque bloc vérifie l'état avant d'agir.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- H1 — Un trigger (plutôt qu'un grant par colonnes, fragile au drift) bloque
-- toute modification de plan/stripe_* par un JWT utilisateur. Le service role
-- (webhooks Stripe) passe : auth.uid() IS NULL pour ses sessions.
-- ---------------------------------------------------------------------------
SET search_path TO public;

CREATE OR REPLACE FUNCTION protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.plan_period IS DISTINCT FROM OLD.plan_period
       OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_started_at IS DISTINCT FROM OLD.subscription_started_at THEN
      RAISE EXCEPTION 'Colonnes de facturation réservées au service (webhook Stripe)'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_billing_columns ON public.profiles;
CREATE TRIGGER trg_protect_billing_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_billing_columns();

-- ---------------------------------------------------------------------------
-- H4 — RLS sur les 3 tables orphelines de 001 (service-role only : aucune
-- politique, le service client bypass la RLS, l'anon/authenticated perd
-- tout accès direct).
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- L2 — midas.exchange_connections : anon n'a rien à faire (RLS le nie de toute
-- façon, on retire le grant par principe de moindre privilège).
-- ---------------------------------------------------------------------------
REVOKE ALL ON midas.exchange_connections FROM anon;

-- ---------------------------------------------------------------------------
-- C1 (complément) — le RPC exec_sql n'a plus de consommateur légitime depuis
-- la fermeture fail-closed de /api/setup. Suppression si présent.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'exec_sql'
  ) THEN
    EXECUTE 'DROP FUNCTION public.exec_sql(text)';
  END IF;
END $$;
