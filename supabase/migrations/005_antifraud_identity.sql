-- =============================================================================
-- Migration 005 : Anti-fraud identity layer (phone, device, IP tracking)
-- Pour @purama/antifraud — MOULE-ANTIFRAUDE.md layer 1+3
--
-- IMPORTANT (découverte prod 2026-09-18) : public.identity_fingerprints
-- existe DÉJÀ sur le VPS avec un design partagé cross-apps :
--   (fingerprint_type, fingerprint_hash, account_id, first_app_slug,
--    last_app_slug, created_at, updated_at)
-- Cette migration est ADDITIVE et ADAPTATIVE :
--   - base fraîche sans table → création complète (design ci-dessous) ;
--   - base avec la table partagée → AUCUNE mutation de ses colonnes ;
--     seul l'index d'unicité global + RLS sont ajoutés (idempotents).
-- =============================================================================
SET search_path TO public;

-- Ajout colonnes identité sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS signup_device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS last_ip_address INET,
  ADD COLUMN IF NOT EXISTS signup_ip_address INET;

-- Table empreintes : créée seulement sur base fraîche (jamais mutée si
-- la table partagée cross-apps existe déjà).
CREATE TABLE IF NOT EXISTS public.identity_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_type TEXT NOT NULL CHECK (fingerprint_type IN ('iban', 'phone', 'document', 'card')),
  fingerprint_hash TEXT NOT NULL,
  app_slug TEXT NOT NULL DEFAULT 'midas',
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  has_app_slug boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'identity_fingerprints'
      AND column_name = 'app_slug'
  ) INTO has_app_slug;

  IF has_app_slug THEN
    -- Design midas (base fraîche) : unicité par (type, hash, app)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_fingerprints_unique
      ON public.identity_fingerprints(fingerprint_type, fingerprint_hash, app_slug);
  ELSE
    -- Design partagé cross-apps (prod VPS) : unicité GLOBALE par (type, hash)
    -- — 1 empreinte = 1 compte, toutes apps confondues (anti-collusion
    -- écosystème). Table vide au moment de l'application (vérifié 2026-09-18).
    CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_fingerprints_unique
      ON public.identity_fingerprints(fingerprint_type, fingerprint_hash);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_identity_fingerprints_account
  ON public.identity_fingerprints(account_id);

-- RLS : les users ne peuvent voir que leurs propres empreintes
ALTER TABLE public.identity_fingerprints ENABLE ROW LEVEL SECURITY;

-- Idempotence : DROP IF EXISTS avant chaque CREATE (CREATE POLICY n'a pas de
-- clause IF NOT EXISTS — rejouer la migration ne doit jamais échouer).
DROP POLICY IF EXISTS "Users can read own fingerprints" ON public.identity_fingerprints;
CREATE POLICY "Users can read own fingerprints" ON public.identity_fingerprints
  FOR SELECT
  USING (auth.uid() = account_id);

-- Admin/service_role peuvent tout voir (anti-fraude backend)
DROP POLICY IF EXISTS "Service role full access" ON public.identity_fingerprints;
CREATE POLICY "Service role full access" ON public.identity_fingerprints
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Colonne stockage liveness face embedding (pour layer 4, si provider intégré ultérieurement)
-- JSONB car format vecteur dépend du provider (Onfido, Veriff, etc)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS liveness_face_embedding JSONB,
  ADD COLUMN IF NOT EXISTS liveness_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.phone_number IS 'Téléphone pour OTP (layer 1). NULL = non fourni.';
COMMENT ON COLUMN public.profiles.phone_verified_at IS 'Horodatage vérification OTP. NULL = non vérifié.';
