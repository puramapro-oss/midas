-- =============================================================================
-- MIDAS — Alignement schéma public pour les crons
-- Les crons écrivent dans public.* avec des colonnes que le schéma n'avait pas.
-- Idempotent. Aligne aussi public.profiles avec auth.users via vue/colonne.
-- =============================================================================

BEGIN;

-- public.market_cache : ajouter key + type (alias des champs métier)
ALTER TABLE public.market_cache
  ADD COLUMN IF NOT EXISTS key TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT;

-- Backfill : key = pair, type = data_type pour compatibilité
UPDATE public.market_cache SET key = pair WHERE key IS NULL;
UPDATE public.market_cache SET type = data_type WHERE type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS market_cache_key_unique ON public.market_cache(key);

-- public.signals : agents_data JSONB pour les signaux multi-agents
ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS agents_data JSONB DEFAULT '{}'::jsonb;

-- public.profiles : colonnes manquantes que les crons et le code attendent
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS paper_trading_until TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS daily_trades_used INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_trades_reset_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Backfill email depuis auth.users
UPDATE public.profiles p
   SET email = u.email
  FROM auth.users u
 WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Backfill super_admin pour matiss.frasne@gmail.com
UPDATE public.profiles
   SET role = 'super_admin'
 WHERE id IN (SELECT id FROM auth.users WHERE email = 'matiss.frasne@gmail.com');

-- Trigger : à la création de profile, auto-fill email + paper_trading_until
CREATE OR REPLACE FUNCTION public.profiles_set_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL THEN
    SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.id;
  END IF;
  IF NEW.paper_trading_until IS NULL THEN
    NEW.paper_trading_until := now() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_set_defaults_trigger ON public.profiles;
CREATE TRIGGER profiles_set_defaults_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_set_defaults();

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_paper_until ON public.profiles(paper_trading_until);

COMMIT;
