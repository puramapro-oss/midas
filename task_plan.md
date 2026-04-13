# MIDAS — Task Plan

## Goal
Compléter MIDAS avec TOUTES les features du CLAUDE.md V3 ULTIMATE.

## Phases Précédentes (toutes ✅)
- [x] P1-P8: Structure, Auth, DB, Pages, CRONs, Wallet, Contests, Tutorial, etc.

## Phase 9 — CLAUDE.md V3 Features Manquantes

### 9.A Schema SQL — Toutes tables manquantes ✅
- [x] 50+ tables ajoutées: points, daily_gifts, achievements, communauté, viralité, lottery, notifications, emails, cross-promo, FAQ, feedback, pools, coupons, pending_earnings, collaborative_missions
- [x] Schema poussé sur VPS via docker exec
- [x] 15 achievements seedés

### 9.B Purama Points + Daily Gift + Boutique ✅
- [x] API /api/points (GET balance + POST earn/spend)
- [x] API /api/daily-gift (GET check + POST claim)
- [x] API /api/boutique (GET items + POST purchase)
- [x] Page /dashboard/boutique
- [x] DailyGiftModal intégré dans DashboardShell

### 9.C Achievements ✅
- [x] API /api/achievements (GET all + unlocked)
- [x] Page /dashboard/achievements
- [x] 15 achievements pour traders MIDAS

### 9.D Communauté d'Amour ✅
- [x] API /api/community/wall (GET posts + POST create)
- [x] API /api/community/circles (GET list + POST join)
- [x] Page /dashboard/community (Mur d'amour + Cercles)
- [x] Sidebar mis à jour

### 9.E Viralité + Lottery ✅
- [x] API /api/lottery (GET draws + tickets + wins)
- [x] API /api/share (GET stats + POST record share + streak multiplier)
- [x] API /api/challenges (GET + POST)
- [x] Page /dashboard/lottery
- [x] Streak multiplier (J1-6=×1, J7-13=×2, J14-29=×3, J30-59=×5, J60-99=×7, J100+=×10)

### 9.F Notifications IA + Emails + Remaining ✅
- [x] API /api/notifications/preferences (GET + PATCH)
- [x] CRON /api/cron/email-sequence (10 séquences auto J0→J30)
- [x] API /api/feedback (POST +200 points)
- [x] API /api/cross-promo (GET recommended apps)
- [x] vercel.json mis à jour avec CRON email-sequence
- [x] Types database.ts enrichis

## Decisions
- Build: PASS 0 erreur
- tsc: PASS 0 erreur
- 60+ API routes
- 30+ pages dashboard
- 50+ tables SQL
- i18n 16 langues existant
- Schema = midas (pas public)

## Phase 10 — Seed + Tests + Deploy ✅
- [x] Seed 14 boutique items dans DB
- [x] Seed 15 FAQ articles dans DB
- [x] Seed lottery draw initial (avril 2026)
- [x] Seed pool balances (reward, asso, partner)
- [x] Seed super admin profile + purama_points
- [x] Created purama_points table (was missing from schema)
- [x] Playwright E2E v3-features.spec.ts — 60/60 PASS (Desktop Chrome + iPhone 14)
- [x] Deploy Vercel prod — https://midas.purama.dev — 200 OK
- [x] curl verify: /, /pricing, /login, /api/market/prices — all 200

## Phase 11 — P4: Admin + Aide + FAQ + Contact ✅
- [x] Admin monitoring page (/admin/monitoring) — health checks, incidents, uptime KPIs, auto-refresh 30s
- [x] API /api/admin/monitoring — query health_checks + incident_log from midas schema
- [x] Admin financement page (/admin/financement) — pool balances (reward/asso/partner), transactions, add funding form
- [x] API /api/admin/financement — GET pools + POST add funding with Zod validation
- [x] Admin layout updated with Monitoring + Financement nav links
- [x] Contact page (/contact) — public form with framer-motion animations, company info
- [x] API /api/contact — Zod validated, inserts into midas.contact_messages
- [x] Middleware updated: /contact added to PUBLIC_ROUTES
- [x] FAQ page (/dashboard/help/faq) — search, category tabs, accordion, helpful votes
- [x] API /api/faq — GET articles + PATCH increment view/helpful count

## Phase 12 — P5: Design + Anim + i18n ✅
- [x] Confetti component (gold/amber, framer-motion, div-based, 50 pieces)
- [x] CinematicIntro component (3.8s, Orbitron logo, gold glow, skip button, localStorage)
- [x] CursorGlow component (300px radial gold gradient follows cursor, desktop only)
- [x] ScrollReveal component (reusable, direction variants, useInView)
- [x] CursorGlow integrated into landing page
- [x] CinematicIntro integrated into DashboardShell
- [x] Confetti integrated into achievements page
- [x] i18n verified: 16 locales, all 331 lines each, perfectly synced
- [x] Playwright: 94/94 PASS (34 P4+P5 + 60 v3-features regression)
- [x] Deploy: https://midas.purama.dev — 200 OK

## Phase P7 — Mobile Expo (iOS + Android) ✅
- [x] Scaffolding Expo 54 + deps (expo-router, NativeWind, Reanimated, Zustand, SecureStore, etc.)
- [x] Auth SecureStore adapter (CLAUDE.md pattern exact)
- [x] API client fetch wrapper vers midas.purama.dev/api/*
- [x] Zustand stores (auth, market, notifications)
- [x] Types TypeScript (Profile, Signal, Trade, Bot, Alert, Achievement, etc.)
- [x] 35 screens: 2 auth + 5 tabs + 28 stack screens
- [x] Tab navigation (Dashboard, Trading, Classement, Chat IA, Parrainage)
- [x] Stack navigation (markets, analysis, alerts, settings, achievements, boutique, lottery, community, help, partenaire, earn, paper, bots, agents, tax, guide, contest)
- [x] Icons generated via sharp (icon 1024x1024, adaptive, splash 1284x2778, favicon 48x48)
- [x] app.json configured (bundle dev.purama.midas, scheme midas, dark theme, plugins)
- [x] eas.json (dev/preview/production profiles, auto-increment, submit config)
- [x] 10 Maestro test flows (auth, navigation, chat, settings, wallet, referral, onboarding, pricing, responsive, error)
- [x] store.config.json (16 languages: fr, en, es, de, it, pt, ar, zh, ja, ko, hi, ru, tr, nl, pl, sv)
- [x] GOOGLE_PLAY_SETUP.md (3-minute setup guide)
- [x] EAS Workflow (.eas/workflows/full-deploy.yaml)
- [x] tsc --noEmit PASS (0 errors)
- [x] expo export --platform web PASS (344 modules bundled)

- [x] store.config.json 16/16 langues Apple + 16/16 langues Android
- [x] .gitignore mis a jour (secrets exclus)
- [x] app.json nettoye (trailing commas, googleServicesFile removed)

## Restant — BLOQUE par EXPO_TOKEN expire
Le token `EXPO_TOKEN=ruJtqpy756415UEEU5mDrJnh6mPQ0lqRBS9q0um2` du CLAUDE.md est invalide.

Pour debloquer :
1. `cd ~/purama/midas/mobile && npx eas-cli login` (email + password Expo)
2. `npx eas-cli init` (lie le projet au compte Expo, genere projectId)
3. `npx eas-cli build --platform all --profile production`
4. `npx eas-cli submit --platform all --profile production`

- [ ] EAS login + init (interactif, requires user action)
- [ ] EAS build iOS + Android
- [ ] Store submissions (iOS App Store + Google Play)

## Phase 13 — Binance Earn + Copy Trading + KYC ✅
- [x] Schema SQL: 7 tables (kyc_verifications, kyc_audit_logs, trader_profiles, copy_relationships, copy_trades, earn_positions, earn_history)
- [x] RLS policies on all 7 tables
- [x] Indexes on user_id, status, ranking_score
- [x] Types TypeScript ajoutés (KycVerification, TraderProfile, CopyRelationship, CopyTrade, EarnPosition, EarnHistoryEntry, KYC_TIER_LIMITS)
- [x] API /api/kyc (GET status + POST submit verification)
- [x] API /api/copy-trading (GET traders/copies/profile/history + POST follow/unfollow/pause/resume/become_trader)
- [x] API /api/earn/positions (GET positions+stats+history + POST subscribe/redeem)
- [x] Page /dashboard/kyc — Wizard 3 étapes (identité, adresse, document) + tier progress + status banners
- [x] Page /dashboard/copy-trading — 3 tabs (Top Traders, Mes Copies, Devenir Trader)
- [x] Page /dashboard/earn — Enhanced with 3 tabs (Opportunités, Mes Positions, Historique) + positions stats
- [x] /dashboard/leaderboard → redirect to /dashboard/copy-trading
- [x] Sidebar: +KYC, Leaderboard→Copy Trading
- [x] tsc PASS + build PASS
- [x] Deploy Vercel prod — 200 OK

## Phase 14 — Features manquantes CLAUDE.md (complet) ✅
### 14.A Pages Dashboard manquantes ✅
- [x] /dashboard/challenges — page complete (create + list + types trading)
- [x] /dashboard/share — page complete (share link + platforms + streak multiplier + native share)
- [x] /dashboard/gratitude — journal de gratitude (+50 pts/entree, max 3/jour, prompts quotidiens)
- [x] /dashboard/breathing — respiration guidee (4-7-8, box, coherent, wim_hof, cercle anime, +30 pts)
- [x] /dashboard/buddies — buddy trading (checkins, moods, streak display)
- [x] /dashboard/stories — story creator (5 templates, generate OG, download, native share)

### 14.B APIs manquantes ✅
- [x] /api/gratitude (GET entries + POST create, +50 pts, max 3/j)
- [x] /api/breathing (GET sessions + POST record, +30 pts, max 3/j)
- [x] /api/community/buddy (GET buddies + POST checkin)
- [x] /api/golden-hour (GET active/next golden hour)
- [x] /api/mentorship (GET as_mentor + as_mentee)
- [x] /api/community-goals (GET active goals)
- [x] /api/review-prompt (GET should_show + POST response, +500 pts if accepted)
- [x] /api/collaborative-missions (GET active + POST join)
- [x] /api/ceremonies (GET recent victory ceremonies)

### 14.C Pages publiques ✅
- [x] /ecosystem — 19 apps Purama grid, cross-promo CROSS50
- [x] /how-it-works — 6 etapes trading IA + features list

### 14.D Sidebar + Types + Middleware ✅
- [x] Sidebar: +6 liens (Challenges, Partage, Gratitude, Respiration, Buddy, Stories)
- [x] Types database.ts: +GratitudeEntry, BreathSession, GoldenHour, CommunityGoal, Mentorship, Challenge, ReviewPrompt
- [x] Middleware: /ecosystem + /how-it-works ajoutes aux routes publiques
- [x] tsc PASS + build PASS
- [x] Deploy Vercel prod — https://midas.purama.dev — 200 OK
- [x] Playwright phase14.spec.ts: 58/58 PASS (Desktop Chrome + iPhone 14)
- [x] curl verify: /, /ecosystem, /how-it-works → 200; APIs → 401 (auth OK)
- [x] git config: purama.pro@gmail.com (requis par Vercel team)

## Phase 15 — QA Complete (21 SIM + Lighthouse + Playwright) ✅
- [x] 21 SIM tests: 96/96 PASS (Desktop Chrome + iPhone 14)
- [x] Phase 14 tests: 58/58 PASS
- [x] V3 Features: 60/60 PASS (regression)
- [x] P4-P5: 34/34 PASS (regression)
- [x] Landing: 22/22 PASS (updated to match current page)
- [x] Security + API: 18/18 PASS
- [x] **Total: 288/288 PASS — ZERO failures**
- [x] Lighthouse: Perf 87, Access 94, BP 100, SEO 100
- [x] LCP 3.3s, CLS 0, TBT 10ms
- [x] grep placeholders/faux contenu = 0
- [x] grep secrets in src = 0
- [x] grep `any` type = 0
- [x] Deploy Vercel prod — READY

## Restant pour MIDAS 100%
- [ ] EAS login + init + build iOS/Android (BLOQUE par token Apple)
- [ ] Store submissions
- [ ] n8n workflows config (57 workflows) — config externe
- [ ] BetterStack + Sentry + PostHog production config — config externe
