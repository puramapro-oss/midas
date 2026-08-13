-- MIDAS — exchange_connections dans le schéma midas (pas public)
-- Contexte (2026-08-13) : 001_initial_schema.sql créait cette table dans `public`,
-- jamais appliquée en pratique (l'app tourne sur le schéma `midas`, comme toutes
-- les apps PURAMA — NEXT_PUBLIC_SUPABASE_DB_SCHEMA=midas). Le code (connect/
-- balance/trade-executor) attendait cette table dans `midas` avec des colonnes
-- api_key_iv/api_secret_iv séparées (pas `encryption_iv` partagé comme dans 001) —
-- elle n'existait nulle part en prod. Un endpoint legacy /api/keys/save écrivait
-- à la place dans midas.exchange_keys (mauvaise table, chiffrement faible,
-- supprimé dans le même correctif) — les clés API exchange des utilisateurs qui
-- passaient par l'onboarding n'ont donc jamais réellement fonctionné.
SET search_path TO midas, public;

CREATE TABLE IF NOT EXISTS midas.exchange_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES midas.profiles(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance','bybit','okx','bitget','kucoin','gate','mexc','htx','coinbase','kraken')),
  label TEXT,
  api_key_encrypted TEXT NOT NULL,
  api_key_iv TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  api_secret_iv TEXT NOT NULL,
  is_testnet BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions TEXT[] NOT NULL DEFAULT ARRAY['read','spot_trade'],
  error_message TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exchange)
);

CREATE INDEX IF NOT EXISTS idx_exchange_connections_user ON midas.exchange_connections(user_id);

ALTER TABLE midas.exchange_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY exchange_connections_select ON midas.exchange_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY exchange_connections_insert ON midas.exchange_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY exchange_connections_update ON midas.exchange_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY exchange_connections_delete ON midas.exchange_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON midas.exchange_connections TO anon, authenticated, service_role;

-- midas.exchange_keys (table legacy de l'endpoint supprimé /api/keys/save) reste
-- en place intentionnellement : 1 ligne réelle datée du 11/04/2026, jamais
-- fonctionnelle (mauvaise table = jamais lue par balance/trade-executor),
-- chiffrement faible (clé placeholder jamais rotée). Migration automatique non
-- tentée (donnée financière sensible, hypothèse sur l'ancienne valeur de la clé
-- non vérifiable avec certitude) — laissée inerte, RLS + 0 lecteur restant après
-- ce correctif. L'utilisateur concerné devra reconnecter son exchange via le flux
-- corrigé (ce n'est pas une régression : sa connexion n'a jamais fonctionné).
