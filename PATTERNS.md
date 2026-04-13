# MIDAS — PATTERNS.md

## DB Access VPS
- Toujours utiliser `supabase_admin` pas `postgres` pour le schema midas
- Commande: `docker exec -i supabase-db psql -U supabase_admin -d postgres`
- Toujours GRANT authenticated apres CREATE TABLE

## Dynamic Imports
- Tout composant avec framer-motion ou browser APIs: `dynamic(() => import(), { ssr: false })`
- Composants concernes: ParticleBackground, TutorialOverlay, DailyGiftModal, CinematicIntro, AffirmationModal, WisdomFooter, SpiritualLayer, SubconsciousEngine

## Types Profile
- XP = `xp_total` (pas `xp`)
- Streak = `streak_days` (pas `streak`)
- Points = `purama_points` (pas `points`)
- Toujours verifier src/types/database.ts avant d'utiliser un champ Profile

## Schema SQL
- Toujours schema `midas.` (pas `public.`)
- RLS enable + policies SELECT/INSERT pour authenticated
- Index sur user_id et created_at

## Deploy Vercel
- `vercel --prod --token $VERCEL_TOKEN --scope puramapro-oss --yes`
- Git email doit etre purama.pro@gmail.com pour le team

## Design MIDAS
- Gold: #FFD700 (primary), #FFC107 (secondary), #B8860B (dark)
- Fond: #06080F (bg-primary), #0C0F1A (bg-secondary)
- Font display: Orbitron (--font-orbitron)
- Font body: DM Sans (--font-dm-sans)
- Font mono: JetBrains Mono (--font-jetbrains-mono)
- Glass: bg-white/5 backdrop-blur-xl border-white/10
