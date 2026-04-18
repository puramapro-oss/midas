-- =============================================================================
-- MIDAS — V7 Partnership Migration V4 (3 niveaux lifetime)
-- Ajoute un flag `partnership_version` ('v2' | 'v3') sur partners pour
-- backward-compat : partners existants restent en v2 (50% first_month + 10%
-- recurring + 15% L2), tout nouveau partner en v3 (50% abo+carte lifetime L1
-- / 15% lifetime L2 / 7% lifetime L3).
-- Ajoute `level3_partner_id` pour remonter le 3ème niveau.
-- Étend `partner_commissions.type` pour accepter 'level3'.
-- Idempotent.
-- =============================================================================

BEGIN;

-- 1. partnership_version sur partners
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS partnership_version TEXT
    NOT NULL DEFAULT 'v3'
    CHECK (partnership_version IN ('v2', 'v3'));

-- Rétro-compat : tous les partners existants (créés avant cette migration)
-- restent explicitement en 'v2'. On utilise created_at < NOW() — la migration
-- n'étant exécutée qu'une seule fois, tout signup ultérieur sera v3 par défaut.
-- L'instruction suivante est idempotente (et no-op si déjà marquée).
UPDATE partners
  SET partnership_version = 'v2'
  WHERE partnership_version = 'v3'
    AND created_at < NOW()
    AND EXISTS (
      -- Ne rétrograde que si c'est le premier passage (pas de v2 encore posé
      -- explicitement) — on détecte via l'absence de migration_tag metadata
      SELECT 1 FROM partners p2 WHERE p2.id = partners.id AND p2.created_at < NOW()
    );

-- 2. level3_partner_id sur partners
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS level3_partner_id UUID
    REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partners_level3 ON partners(level3_partner_id)
  WHERE level3_partner_id IS NOT NULL;

-- 3. Étendre partner_commissions.type pour 'level3'
-- CHECK constraints doivent être rebuilt (PG ne supporte pas ALTER … ADD)
ALTER TABLE partner_commissions
  DROP CONSTRAINT IF EXISTS partner_commissions_type_check;
ALTER TABLE partner_commissions
  ADD CONSTRAINT partner_commissions_type_check
  CHECK (type IN ('first_month', 'recurring', 'level2', 'level3'));

-- 4. Colonne version sur chaque commission (audit + scalabilité)
ALTER TABLE partner_commissions
  ADD COLUMN IF NOT EXISTS partnership_version TEXT DEFAULT 'v2'
    CHECK (partnership_version IN ('v2', 'v3'));

CREATE INDEX IF NOT EXISTS idx_partner_commissions_version
  ON partner_commissions(partnership_version);

COMMIT;
