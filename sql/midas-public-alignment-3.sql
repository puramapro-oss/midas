-- Round 3 — relax constraints + backfill triggers

BEGIN;

-- Allow new crons to insert without legacy pair/data_type
ALTER TABLE public.market_cache
  ALTER COLUMN pair DROP NOT NULL,
  ALTER COLUMN data_type DROP NOT NULL,
  ALTER COLUMN expires_at DROP NOT NULL;

-- Trigger : si key est fourni, dupliquer dans pair (et type → data_type)
CREATE OR REPLACE FUNCTION public.market_cache_backfill_legacy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pair IS NULL AND NEW.key IS NOT NULL THEN
    NEW.pair := NEW.key;
  END IF;
  IF NEW.data_type IS NULL AND NEW.type IS NOT NULL THEN
    NEW.data_type := NEW.type;
  END IF;
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + interval '1 day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS market_cache_backfill_legacy_trigger ON public.market_cache;
CREATE TRIGGER market_cache_backfill_legacy_trigger
  BEFORE INSERT OR UPDATE ON public.market_cache
  FOR EACH ROW EXECUTE FUNCTION public.market_cache_backfill_legacy();

-- Étendre les valeurs autorisées de signals.strength
ALTER TABLE public.signals
  DROP CONSTRAINT IF EXISTS signals_strength_check;
ALTER TABLE public.signals
  ADD CONSTRAINT signals_strength_check
  CHECK (strength = ANY (ARRAY[
    'weak', 'moderate', 'strong', 'very_strong',
    'low', 'medium', 'high', 'extreme'
  ]));

COMMIT;
