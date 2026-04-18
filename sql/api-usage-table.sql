-- =============================================================================
-- MIDAS — Table api_usage pour tracking historique des appels API
-- Brief MIDAS-BRIEF-ULTIMATE.md : "Table Supabase api_usage : tracker les appels par API par jour"
-- Complète le tracking Redis (real-time) avec un historique persistant pour
-- le dashboard admin + analyse trends + alertes.
-- Idempotent (CREATE IF NOT EXISTS).
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS midas;

CREATE TABLE IF NOT EXISTS midas.api_usage (
  id BIGSERIAL PRIMARY KEY,
  api_name TEXT NOT NULL,
  period_key TEXT NOT NULL, -- '2026-04-18' (day) or '2026-04' (month)
  period_type TEXT NOT NULL CHECK (period_type IN ('day','month')),
  call_count INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER,
  alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (api_name, period_key)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_api ON midas.api_usage(api_name);
CREATE INDEX IF NOT EXISTS idx_api_usage_period ON midas.api_usage(period_key);
CREATE INDEX IF NOT EXISTS idx_api_usage_recent ON midas.api_usage(created_at DESC);

CREATE OR REPLACE FUNCTION midas.api_usage_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS api_usage_updated_at ON midas.api_usage;
CREATE TRIGGER api_usage_updated_at
  BEFORE UPDATE ON midas.api_usage
  FOR EACH ROW EXECUTE FUNCTION midas.api_usage_set_updated_at();

-- RLS : seul le service_role lit/écrit. Aucun client ne touche cette table.
ALTER TABLE midas.api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_usage_service_only ON midas.api_usage;
CREATE POLICY api_usage_service_only ON midas.api_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
