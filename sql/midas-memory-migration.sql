-- =============================================================================
-- MIDAS — Memory & Calibration alignment to MIDAS-BRIEF-ULTIMATE.md
-- Ajoute les colonnes manquantes sans casser l'existant.
-- Idempotent (ADD COLUMN IF NOT EXISTS).
-- =============================================================================

BEGIN;

-- ai_memory : ajouter trade_id, profit_pct, pair, market_regime, indicators_snapshot,
-- predicted_confidence (numeric), actual_outcome alias.
ALTER TABLE midas.ai_memory
  ADD COLUMN IF NOT EXISTS trade_id UUID,
  ADD COLUMN IF NOT EXISTS predicted_confidence DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS actual_outcome TEXT,
  ADD COLUMN IF NOT EXISTS profit_pct DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS strategy TEXT,
  ADD COLUMN IF NOT EXISTS pair TEXT,
  ADD COLUMN IF NOT EXISTS market_regime TEXT,
  ADD COLUMN IF NOT EXISTS indicators_snapshot JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lesson TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_memory_trade ON midas.ai_memory(trade_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_pair ON midas.ai_memory(pair);
CREATE INDEX IF NOT EXISTS idx_ai_memory_regime ON midas.ai_memory(market_regime);

-- calibration : ajouter predicted_range, actual_win_rate, adjustment, updated_at
ALTER TABLE midas.calibration
  ADD COLUMN IF NOT EXISTS predicted_range TEXT,
  ADD COLUMN IF NOT EXISTS actual_win_rate DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS adjustment DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_calibration_strategy ON midas.calibration(strategy);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION midas.calibration_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calibration_updated_at ON midas.calibration;
CREATE TRIGGER calibration_updated_at
  BEFORE UPDATE ON midas.calibration
  FOR EACH ROW EXECUTE FUNCTION midas.calibration_set_updated_at();

COMMIT;
