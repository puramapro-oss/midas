# MIDAS P7 Mobile - Expo iOS + Android

## Overview
Native mobile client for MIDAS trading platform. Thin client calling existing web API at `midas.purama.dev/api/*`. All business logic remains server-side.

## Stack
- Expo 52 + expo-router (file-based routing)
- NativeWind (Tailwind for RN)
- Reanimated 3 (animations)
- Zustand (state management)
- expo-secure-store (token storage)
- Bundle ID: `dev.purama.midas`
- Scheme: `midas`

## Architecture

### Auth
SecureStore adapter per CLAUDE.md pattern. Supabase client with:
- `getItem` / `setItem` / `removeItem` via SecureStore (native) or localStorage (web)
- Auto-refresh tokens
- Deep link callback: `midas://auth/callback`
- Google OAuth via `expo-auth-session`

### API Client
Centralized fetch wrapper:
- Base URL: `https://midas.purama.dev/api`
- Bearer token from Supabase session
- Auto-retry 3x with exponential backoff
- Offline detection + queue

### Navigation (expo-router)
```
app/
  _layout.tsx          (root: auth check, providers)
  (auth)/
    _layout.tsx        (stack, no tabs)
    login.tsx
    register.tsx
    onboarding.tsx
  (tabs)/
    _layout.tsx        (bottom tab bar, 5 tabs)
    index.tsx          (Dashboard - portfolio, signals, activity)
    trading.tsx        (Execute trades, bots overview)
    classement.tsx     (Leaderboard)
    chat.tsx           (AI chat)
    referral.tsx       (Referral + wallet)
  (stack)/
    _layout.tsx        (stack navigator)
    markets.tsx
    analysis/[pair].tsx
    alerts.tsx
    settings.tsx
    settings/exchanges.tsx
    achievements.tsx
    boutique.tsx
    lottery.tsx
    community.tsx
    help.tsx
    help/faq.tsx
    help/connect-binance.tsx
    partenaire.tsx
    partenaire/commissions.tsx
    partenaire/outils.tsx
    earn.tsx
    paper.tsx
    bots/[id].tsx
    agents.tsx
    tax.tsx
    guide.tsx
    contest.tsx
```

### Bottom Tab Bar (5 items)
1. Dashboard (LayoutDashboard icon) - Main overview
2. Trading (TrendingUp) - Trade execution
3. Classement (Trophy) - Leaderboard
4. Chat (MessageCircle) - AI assistant
5. Parrainage (Users) - Referral + wallet

### State (Zustand)
Stores:
- `useAuthStore` - user, profile, session, loading
- `useMarketStore` - prices, pairs, candles cache
- `useTradeStore` - positions, history, paper trades
- `useNotifStore` - notifications, unread count

### Offline Support
- NetInfo for connectivity detection
- Cache market prices (5min TTL)
- Queue trades when offline, execute on reconnect
- Show stale data indicator

### Push Notifications
- expo-notifications + FCM (Android) + APNs (iOS)
- Register token on login, store in `push_tokens` table
- Types: signal alerts, trade executed, price alerts, contest results

### Theme
- Dark default (#0A0A0F)
- OLED (#000000)
- Light mode
- Gold accent (#F59E0B)
- Orbitron font for headings

### Icons & Splash
- Pollinations: bull icon with #F59E0B + #7C3AED gradient
- icon.png: 1024x1024
- adaptive-icon.png: 1024x1024 with 100px padding on #0A0A0F
- splash.png: 1284x2778
- favicon.png: 48x48
- feature-graphic.png: 1024x500

## Testing
10 Maestro flows:
1. auth - login/register/logout
2. navigation - all tabs + stack screens
3. chat - send message, receive response
4. settings - change theme, connect exchange
5. wallet - check balance, request withdrawal
6. referral - copy code, view stats
7. onboarding - complete flow
8. pricing - view plans
9. responsive - portrait/landscape
10. error - offline mode, API failure

## Store Config
- 16 languages (fr, en, es, de, it, pt, ar, zh, ja, ko, hi, ru, tr, nl, pl, sv)
- store.config.json for EAS metadata
- App name: MIDAS - Trading IA
- Category: Finance
- Content rating: Everyone

## EAS Config
- eas.json: dev/preview/production profiles
- Auto-increment version
- Submit to both stores
- .eas/workflows/full-deploy.yaml

## Deliverables
1. `mobile/` directory with full Expo project
2. Auth with SecureStore
3. All 30+ screens
4. 10 Maestro test flows
5. store.config.json (16 langs)
6. GOOGLE_PLAY_SETUP.md
7. EAS workflows
8. Icons generated
9. app.json + eas.json configured
