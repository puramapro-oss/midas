-- Round 2 — colonnes restantes

BEGIN;

ALTER TABLE public.market_cache
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS confluences_count INT DEFAULT 0;

-- Trigger pour auto-update
CREATE OR REPLACE FUNCTION public.market_cache_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS market_cache_updated_at ON public.market_cache;
CREATE TRIGGER market_cache_updated_at
  BEFORE UPDATE ON public.market_cache
  FOR EACH ROW EXECUTE FUNCTION public.market_cache_set_updated_at();

COMMIT;
