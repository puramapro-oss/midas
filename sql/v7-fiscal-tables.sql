-- =============================================================================
-- MIDAS — V7 §25 Fiscal Notifications + Annual Summaries
-- Système universel notification fiscale (4 paliers 1500/2500/3000€)
-- + récapitulatif annuel auto pour DAS2 Pennylane.
-- DIFFÉRENT du flow CERFA 2086 (P&L crypto trading) déjà en place.
-- Idempotent.
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS midas;

-- 4 paliers : 1500 / 2500 / 3000 / annual_summary (1er janvier)
CREATE TABLE IF NOT EXISTS midas.fiscal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  palier INTEGER NOT NULL CHECK (palier IN (1, 2, 3, 4)), -- 1=1500€, 2=2500€, 3=3000€, 4=annual
  threshold_eur NUMERIC NOT NULL,
  total_at_trigger NUMERIC NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  push_sent BOOLEAN NOT NULL DEFAULT false,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, palier)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_notifications_user ON midas.fiscal_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_notifications_recent ON midas.fiscal_notifications(sent_at DESC);

-- Récapitulatif annuel — généré 1er janvier pour chaque user > 0€ gains plateforme
CREATE TABLE IF NOT EXISTS midas.annual_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_primes NUMERIC NOT NULL DEFAULT 0,
  total_parrainage NUMERIC NOT NULL DEFAULT 0,
  total_nature NUMERIC NOT NULL DEFAULT 0,
  total_marketplace NUMERIC NOT NULL DEFAULT 0,
  total_missions NUMERIC NOT NULL DEFAULT 0,
  total_other NUMERIC NOT NULL DEFAULT 0,
  total_annuel NUMERIC NOT NULL DEFAULT 0,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  das2_sent BOOLEAN NOT NULL DEFAULT false,
  das2_sent_at TIMESTAMPTZ,
  UNIQUE (user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_annual_summaries_user_year ON midas.annual_summaries(user_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_annual_summaries_das2 ON midas.annual_summaries(das2_sent) WHERE das2_sent = false;

-- RLS : user lit ses propres données, service écrit
ALTER TABLE midas.fiscal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.annual_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fiscal_notif_select_own ON midas.fiscal_notifications;
CREATE POLICY fiscal_notif_select_own ON midas.fiscal_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS fiscal_notif_service_all ON midas.fiscal_notifications;
CREATE POLICY fiscal_notif_service_all ON midas.fiscal_notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS annual_select_own ON midas.annual_summaries;
CREATE POLICY annual_select_own ON midas.annual_summaries
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS annual_service_all ON midas.annual_summaries;
CREATE POLICY annual_service_all ON midas.annual_summaries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
