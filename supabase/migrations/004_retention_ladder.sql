-- ============================================================================
-- MIDAS — 004 : Échelle anti-résiliation (RETENTION-BRIEF.md, décision Tissma
-- 02/09/2026). Pilote #10 @purama/retention.
-- Cible schéma `midas` (cohérent avec les autres tables app-spécifiques :
-- cross_promos, user_coupons, email_sequences — profiles/auth restent public).
-- ============================================================================

SET search_path TO midas, public;

-- ============================================================
-- 1. midas.promo_codes_log — verrou anti-doublon -50%x3 (SAVE50)
-- ============================================================
CREATE TABLE IF NOT EXISTS midas.promo_codes_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  code             TEXT NOT NULL,
  stripe_coupon_id TEXT,
  discount_pct     SMALLINT,
  context          TEXT CHECK (context IN ('signup','renewal','retention','cross_promo','influencer','event')),
  applied_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verrou : 1 seule ligne SAVE50 par user, insert AVANT tout appel Stripe (racy check-then-act évité)
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_save50_once
  ON midas.promo_codes_log(user_id)
  WHERE code = 'SAVE50';

CREATE INDEX IF NOT EXISTS idx_promo_codes_user ON midas.promo_codes_log(user_id);

ALTER TABLE midas.promo_codes_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_own_read" ON midas.promo_codes_log;
CREATE POLICY "promo_own_read" ON midas.promo_codes_log
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 2. midas.retention_events — journal §3 (anonymisable). Sert aussi de source
-- pour la date de résiliation (J+7/J+30), pas de colonne dupliquée sur profiles.
-- ============================================================
CREATE TABLE IF NOT EXISTS midas.retention_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step       TEXT NOT NULL CHECK (step IN ('pertes','pause','palier','annuel','discount50','feedback')),
  action     TEXT NOT NULL CHECK (action IN ('viewed','accepted','declined')),
  metadata   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_events_user ON midas.retention_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retention_events_cancel ON midas.retention_events(step, action, created_at) WHERE step = 'feedback' AND action = 'accepted';

ALTER TABLE midas.retention_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "retention_events_own_read" ON midas.retention_events;
CREATE POLICY "retention_events_own_read" ON midas.retention_events
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT, INSERT ON midas.promo_codes_log TO authenticated, service_role;
GRANT SELECT, INSERT ON midas.retention_events TO authenticated, service_role;
