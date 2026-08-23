-- 003_legal_core.sql — Socle légal partagé NIYAMA (packages/legal/sql/001_legal_core.sql),
-- adapté au schéma `midas` (dédié à cette app, cf src/lib/legal/db.ts pour la justification :
-- `public` est le schéma par défaut de l'instance Postgres PARTAGÉE de l'écosystème Purama,
-- `midas` est le schéma explicitement créé pour cette app — CREATE TABLE __SCHEMA__ remplacé
-- par `midas`, pas `public`).
--
-- NON EXÉCUTÉ à la création de ce fichier (2026-08-23) : SSH root@72.62.191.111 port 22
-- refusé depuis cet environnement d'exécution (connection refused, host joignable en ping).
-- À exécuter manuellement dès qu'un accès SSH VPS est disponible, cf ERRORS.md.
--
-- Ordre sûr (piège PIEGES.md §16 — schéma déjà créé ici via schema.sql, mais on garde
-- l'ordre complet pour que ce fichier soit rejouable seul sur un schéma neuf) :
--   1. CREATE SCHEMA IF NOT EXISTS (idempotent, 0 risque)
--   2. Les 3 tables
--   3. GRANTs explicites (les nouvelles tables n'héritent PAS forcément des
--      ALTER DEFAULT PRIVILEGES posés lors des migrations précédentes du schéma)
--   4. NOTIFY pgrst pour recharger le cache de schéma PostgREST
--
-- Exécution (depuis le VPS, bypass Supavisor) :
--   docker exec -i supabase-db psql -U postgres -d postgres -f /dev/stdin < 003_legal_core.sql
-- Puis régénérer src/types/database.ts.

CREATE SCHEMA IF NOT EXISTS midas;

-- 1. Preuve d'acceptation CGU/CGV/politique de confidentialité, versionnée et horodatée.
CREATE TABLE IF NOT EXISTS midas.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('mentions', 'cgu', 'cgv', 'confidentialite')),
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip INET,
  user_agent TEXT,
  UNIQUE (user_id, doc_type)
);

CREATE INDEX IF NOT EXISTS legal_acceptances_user_id_idx ON midas.legal_acceptances (user_id);

ALTER TABLE midas.legal_acceptances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY legal_acceptances_select_own ON midas.legal_acceptances
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY legal_acceptances_insert_own ON midas.legal_acceptances
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Consentement cookies — 1 ligne par utilisateur authentifié.
CREATE TABLE IF NOT EXISTS midas.cookie_consents (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  necessaire BOOLEAN NOT NULL DEFAULT true,
  mesure BOOLEAN NOT NULL DEFAULT false,
  marketing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE midas.cookie_consents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY cookie_consents_select_own ON midas.cookie_consents
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY cookie_consents_insert_own ON midas.cookie_consents
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY cookie_consents_update_own ON midas.cookie_consents
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Demandes de suppression de compte avec période de grâce (RGPD art. 17).
--    Schéma identique à `arogya.account_deletion_requests` — ne pas renommer les colonnes,
--    `api/account/delete/route.ts` et `api/cron/account-deletion/route.ts` en dépendent tels quels.
CREATE TABLE IF NOT EXISTS midas.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'executing', 'completed', 'cancelled')),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_due_idx
  ON midas.account_deletion_requests (status, scheduled_for);

ALTER TABLE midas.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY account_deletion_requests_select_own ON midas.account_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY account_deletion_requests_insert_own ON midas.account_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY account_deletion_requests_update_own ON midas.account_deletion_requests
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- GRANTs explicites (piège PIEGES.md §16 : les nouvelles tables n'héritent pas forcément
-- des ALTER DEFAULT PRIVILEGES posés par les migrations précédentes du schéma `midas`).
GRANT USAGE ON SCHEMA midas TO anon, authenticated, service_role;
GRANT ALL ON midas.legal_acceptances, midas.cookie_consents, midas.account_deletion_requests
  TO service_role, postgres;
GRANT SELECT, INSERT ON midas.legal_acceptances TO authenticated;
GRANT SELECT, INSERT, UPDATE ON midas.cookie_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON midas.account_deletion_requests TO authenticated;

NOTIFY pgrst, 'reload schema';
