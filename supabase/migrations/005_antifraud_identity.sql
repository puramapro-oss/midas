-- =============================================================================
-- Migration 005: Anti-fraud identity layer (phone, device, IP tracking)
-- Pour @purama/antifraud — MOULE-ANTIFRAUDE.md layer 1+3
-- =============================================================================

-- Ajout colonnes identité sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS last_ip_address INET,
  ADD COLUMN IF NOT EXISTS signup_ip_address INET,
  ADD COLUMN IF NOT EXISTS signup_device_fingerprint TEXT;

-- Index pour recherche anti-collusion (même device/IP/phone)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_device ON public.profiles(last_device_fingerprint) WHERE last_device_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_ip ON public.profiles(last_ip_address) WHERE last_ip_address IS NOT NULL;

-- Table cross-écosystème pour empreintes IBAN partagées (unicité globale)
-- Note: idéalement dans schéma `public` du VPS partagé pour vraie unicité cross-apps,
-- mais pour l'instant on track dans le schéma midas local (anti-collusion intra-app).
CREATE TABLE IF NOT EXISTS public.identity_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_type TEXT NOT NULL CHECK (fingerprint_type IN ('iban', 'phone', 'document', 'card')),
  fingerprint_hash TEXT NOT NULL,
  app_slug TEXT NOT NULL DEFAULT 'midas',
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index unicité : 1 empreinte = 1 compte par app (permet plusieurs apps partageant même IBAN si légitime)
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_fingerprints_unique
  ON public.identity_fingerprints(fingerprint_type, fingerprint_hash, app_slug);

-- Index lookup par compte
CREATE INDEX IF NOT EXISTS idx_identity_fingerprints_account
  ON public.identity_fingerprints(account_id);

-- RLS : les users ne peuvent voir que leurs propres empreintes
ALTER TABLE public.identity_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own fingerprints" ON public.identity_fingerprints
  FOR SELECT
  USING (auth.uid() = account_id);

-- Admin/service_role peuvent tout voir (anti-fraude backend)
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
COMMENT ON COLUMN public.profiles.liveness_face_embedding IS 'Vecteur face (provider-dependent) pour unicité visage layer 4.';
COMMENT ON TABLE public.identity_fingerprints IS 'Empreintes SHA-256 IBAN/phone/document pour unicité cross-comptes (layer 1+3).';
