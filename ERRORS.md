# MIDAS — ERRORS.md

| DATE | BUG | CAUSE | FIX |
|------|-----|-------|-----|
| 2026-04-09 | purama_points table missing | Schema oublie lors du push initial | CREATE TABLE midas.purama_points manuellement |
| 2026-04-09 | Build fail tsparticles | Import SSR incompatible | dynamic(() => import(), { ssr: false }) |
| 2026-04-13 | Vercel deploy fail git author | Email ne matchait pas le team Vercel | git config user.email purama.pro@gmail.com |
| 2026-04-14 | breath_sessions table missing | Table definie dans code API mais jamais creee en DB | CREATE TABLE midas.breath_sessions via supabase_admin |
| 2026-04-14 | /api/og 404 | Endpoint reference dans layout.tsx metadata mais jamais cree | Cree route.tsx avec @vercel/og ImageResponse |
| 2026-04-14 | useAwakening TS error xp/streak | Profile type utilise xp_total et streak_days, pas xp et streak | Corriger les noms de champs dans le hook |
| 2026-04-14 | docker exec permission denied midas schema | User postgres n'a pas les droits sur schema midas | Utiliser supabase_admin + GRANT authenticated |
