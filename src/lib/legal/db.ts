import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Client service_role scopé au schéma `midas` — les 3 tables du socle légal
 * (`legal_acceptances`, `cookie_consents`, `account_deletion_requests`) y vivent,
 * PAS dans `public` (où sont `profiles`/`trades`/`chat_messages`). `public` est le
 * schéma par défaut de l'instance Postgres partagée de l'écosystème Purama
 * (`auth.purama.dev`, même URL/anon key que les ~20 autres apps) — non garanti
 * exclusif à MIDAS. `midas` est un schéma explicitement créé pour cette app
 * (`CREATE SCHEMA IF NOT EXISTS midas`, cf schema.sql) et déjà utilisé par une
 * quinzaine de routes (wallet, wealth, kyc, admin...) via le même pattern de
 * client ad hoc scopé — voir `src/lib/data/api-manager.ts`.
 */
export function getLegalServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'midas' },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
