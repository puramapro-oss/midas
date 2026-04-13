-- Round 4 — accept toutes les valeurs de strength utilisées par les crons MIDAS
BEGIN;

ALTER TABLE public.signals
  DROP CONSTRAINT IF EXISTS signals_strength_check;

ALTER TABLE public.signals
  ADD CONSTRAINT signals_strength_check
  CHECK (strength = ANY (ARRAY[
    'weak', 'moderate', 'strong', 'very_strong',
    'low', 'medium', 'high', 'extreme',
    'buy', 'sell', 'hold', 'strong_buy', 'strong_sell', 'neutral'
  ]));

COMMIT;
