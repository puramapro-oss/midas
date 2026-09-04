-- ENTRAIDE — couche sociale transverse (mise en relation, missions collectives 2+, contact sécurisé)
-- Intégration @purama/entraide dans schéma midas (2026-09-04)
-- Source: /Users/matissdornier/purama/packages/purama-entraide/MOULE-ENTRAIDE.md §7

-- Profils de mise en relation (1 ligne par user qui active l'entraide, opt-in).
CREATE TABLE IF NOT EXISTS midas.entraide_profils (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  skills_offered     text[] NOT NULL DEFAULT '{}',
  skills_needed      text[] NOT NULL DEFAULT '{}',
  availability_days  text[] NOT NULL DEFAULT '{}',
  radius_km          integer,
  location_lat       double precision,
  location_lng       double precision,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE midas.entraide_profils ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY entraide_profils_read_all ON midas.entraide_profils
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY entraide_profils_write_self ON midas.entraide_profils
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON midas.entraide_profils TO authenticated;
GRANT ALL ON midas.entraide_profils TO service_role;

-- Blocage unilatéral (n'implique jamais la personne bloquée).
CREATE TABLE IF NOT EXISTS midas.entraide_blocages (
  blocker_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
ALTER TABLE midas.entraide_blocages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY entraide_blocages_self ON midas.entraide_blocages
    FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT, INSERT, DELETE ON midas.entraide_blocages TO authenticated;
GRANT ALL ON midas.entraide_blocages TO service_role;

-- Missions COLLECTIVES — table séparée de collaborative_missions (feature existante différente).
-- Cette table est pour la lib @purama/entraide (mise en relation 2+ traders pour analyse commune).
CREATE TABLE IF NOT EXISTS midas.missions_collectives (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text NOT NULL,
  description       text NOT NULL DEFAULT '',
  min_participants  integer NOT NULL CHECK (min_participants >= 2),
  max_participants  integer,
  status            text NOT NULL DEFAULT 'ouverte'
                     CHECK (status IN ('ouverte','prete','en_cours','terminee','annulee')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (max_participants IS NULL OR max_participants >= min_participants)
);
CREATE TABLE IF NOT EXISTS midas.missions_collectives_participants (
  mission_id  uuid NOT NULL REFERENCES midas.missions_collectives(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_missions_collectives_status ON midas.missions_collectives(status);
ALTER TABLE midas.missions_collectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE midas.missions_collectives_participants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY missions_collectives_read_all ON midas.missions_collectives
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY missions_collectives_participants_read_all ON midas.missions_collectives_participants
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Pas de policy INSERT/UPDATE/DELETE authenticated : les transitions d'état passent
-- TOUJOURS par les fonctions pures (join/leave/start/complete/cancel Mission) appelées
-- depuis une route serveur service_role — jamais un écrit direct client (racy sous
-- double-clic, contourne le quorum/le statut).
GRANT SELECT ON midas.missions_collectives, midas.missions_collectives_participants TO authenticated;
GRANT ALL ON midas.missions_collectives, midas.missions_collectives_participants TO service_role;

-- Demandes de contact — jamais de PII stockée ici, uniquement le workflow d'autorisation.
CREATE TABLE IF NOT EXISTS midas.entraide_contact_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','declined','expired','blocked')),
  message       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_entraide_contact_requester_day
  ON midas.entraide_contact_requests(requester_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entraide_contact_one_pending
  ON midas.entraide_contact_requests(requester_id, recipient_id)
  WHERE status = 'pending';
ALTER TABLE midas.entraide_contact_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY entraide_contact_requests_parties ON midas.entraide_contact_requests
    FOR SELECT USING (auth.uid() IN (requester_id, recipient_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- INSERT/UPDATE uniquement service_role : canSendContactRequest()/respondToContactRequest()
-- doivent être évalués côté serveur AVANT toute écriture (verrou anti-doublon = l'index
-- unique ci-dessus, jamais un simple check applicatif racy).
GRANT SELECT ON midas.entraide_contact_requests TO authenticated;
GRANT ALL ON midas.entraide_contact_requests TO service_role;

-- Signalements — lecture réservée à l'admin/service_role (pas de liste publique).
CREATE TABLE IF NOT EXISTS midas.entraide_signalements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE midas.entraide_signalements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY entraide_signalements_insert_self ON midas.entraide_signalements
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT INSERT ON midas.entraide_signalements TO authenticated;
GRANT ALL ON midas.entraide_signalements TO service_role;
