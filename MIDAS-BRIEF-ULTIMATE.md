# MIDAS — BRIEF ULTIME POUR CLAUDE CODE
# L'IA de trading la plus puissante qui existe
# Toutes les clés API, toute l'architecture, tout ce qu'il faut

---

## 🎯 MISSION

MIDAS est une plateforme de trading IA automatique sur midas.purama.dev.
Elle est DÉJÀ LIVE. Ce brief est pour CONNECTER toutes les APIs de données et rendre l'IA de trading la plus puissante du marché.

L'app existe déjà avec : auth Google, onboarding, dashboard, chat IA, parrainage MIDAS-XXXXX, wallet, concours, admin (matiss.frasne@gmail.com), centre d'aide 18 FAQ, pages légales RGPD, tuto interactif.

CE QUI MANQUE : connecter les 24 sources de données ci-dessous + activer les 6 sous-agents IA + MIDAS SHIELD + trading automatique.

---

## 🔑 TOUTES LES CLÉS API — VARIABLES D'ENVIRONNEMENT

```env
# === DONNÉES MARCHÉ (avec clé) ===
COINMARKETCAP_API_KEY=e1e9e3e4713e4a999cc3eafddd796415
NEWSAPI_API_KEY=d277700700b34b2ab03f79347882cab3
ETHERSCAN_API_KEY=IAWB6D23KH11I5QSE5QKFGAZ86TH7M5MYV
DUNE_API_KEY=s9G6xOjmj1ev4fCGAkhLDCnx1aRLRVaA
COINMARKETCAL_API_KEY=7CaY0wEU6n3BWvHslO5yk5QmNTQ2JercaebzgBHr
YOUTUBE_API_KEY=AIzaSyCDzMpxdHHdMPqEofljcabybVuOeFLMiKk

# === DONNÉES MARCHÉ (sans clé — appeler directement) ===
# Binance REST: https://api.binance.com/api/v3/
# Binance WebSocket: wss://stream.binance.com:9443/ws
# Binance Futures REST: https://fapi.binance.com/fapi/v1/
# Binance Futures WS: wss://fstream.binance.com/ws
# CoinPaprika: https://api.coinpaprika.com/v1/
# DefiLlama: https://api.llama.fi/
# Alternative.me Fear&Greed: https://api.alternative.me/fng/
# Reddit JSON: https://www.reddit.com/r/bitcoin/.json
# Google Trends: npm package google-trends-api
# free-crypto-news: https://github.com/nirholas/free-crypto-news

# === EXISTANTS (déjà dans l'app) ===
# ANTHROPIC_API_KEY (Claude — chat IA + agents)
# SUPABASE_URL + SUPABASE_ANON_KEY
# STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY + STRIPE_WEBHOOK_SECRET
# NEXT_PUBLIC_BINANCE_REFERRAL=CPA_00BM2GEU29
```

Ajouter TOUTES ces clés dans Vercel : Settings → Environment Variables.

---

## 📊 24 SOURCES DE DONNÉES — ARCHITECTURE D'INTÉGRATION

### PRIORITÉ 1 — Données Binance (GRATUIT, ILLIMITÉ, sans clé)
Créer `lib/data/binance.ts`:

1. **Binance REST** — prix, klines multi-timeframe, order book, aggTrades
   - GET /api/v3/klines — chandeliers 1m, 5m, 15m, 1h, 4h, 1d, 1w
   - GET /api/v3/depth?limit=5000 — order book profond (murs achat/vente)
   - GET /api/v3/aggTrades — filtrer trades > 100 000$ = whales
   - GET /api/v3/ticker/24hr — stats 24h (volume, high, low, nb trades)

2. **Binance WebSocket** — streaming temps réel
   - wss://stream.binance.com:9443/ws/btcusdt@ticker — prix live
   - wss://stream.binance.com:9443/ws/btcusdt@kline_1m — chandeliers live

3. **Binance Futures** — données que PERSONNE n'exploite
   - GET /fapi/v1/openInterest — Open Interest (argent engagé)
   - GET /fapi/v1/fundingRate — Funding Rate (>0.1% = danger, <-0.05% = opportunité)
   - GET /fapi/v1/topLongShortPositionRatio — Ratio Long/Short top traders
   - GET /fapi/v1/takerlongshortRatio — Ratio acheteurs/vendeurs agressifs
   - GET /fapi/v1/globalLongShortAccountRatio — Ratio global retail
   - wss://fstream.binance.com/ws/!forceOrder@arr — liquidations temps réel

### PRIORITÉ 2 — Données agrégées (avec clé)
Créer `lib/data/market-data.ts`:

4. **CoinMarketCap** (10K crédits/mois, 30 req/min)
   - GET /v1/cryptocurrency/listings/latest — top cryptos, prix, volumes, market cap
   - GET /v1/cryptocurrency/quotes/latest — prix détaillé par symbol
   - GET /v1/global-metrics/quotes/latest — données marché global
   - Header: X-CMC_PRO_API_KEY

5. **CoinPaprika** (20K calls/mois, sans clé)
   - GET /v1/tickers — prix + volume toutes cryptos
   - GET /v1/coins/{id}/events — événements par coin
   - GET /v1/coins/{id}/twitter — social data

6. **CoinMarketCal** (calendrier événements)
   - GET /v1/events — halvings, unlocks, mainnet launches, listings
   - Header: x-api-key

### PRIORITÉ 3 — Sentiment & News
Créer `lib/data/sentiment.ts`:

7. **Alternative.me** (ILLIMITÉ, sans clé)
   - GET /fng/ — Fear & Greed Index (0-100)
   - GET /fng/?limit=30 — historique 30 jours

8. **NewsAPI** (100 req/jour)
   - GET /v2/everything?q=bitcoin+crypto — news mainstream
   - Header: X-Api-Key

9. **Reddit JSON** (sans clé)
   - GET /r/bitcoin/.json — posts récents
   - GET /r/cryptocurrency/.json — posts récents
   - GET /r/CryptoMarkets/.json — posts récents
   - Analyser les titres : compter mots positifs/négatifs → score sentiment

10. **Google Trends** (npm google-trends-api, sans clé)
    - interestOverTime({keyword: 'bitcoin'}) — intérêt public
    - Si intérêt explose → signal que le marché est en FOMO

11. **YouTube Data API** (10K req/jour)
    - GET /youtube/v3/search?q=bitcoin+trading — vidéos récentes influenceurs
    - Analyser titres : détecter FUD ou FOMO dans les thumbnails/titres

12. **free-crypto-news** (sans clé, open source)
    - News temps réel + sentiment Reddit + on-chain + predictions Polymarket
    - Endpoint: https://cryptocurrency.cv/api/

### PRIORITÉ 4 — On-chain
Créer `lib/data/onchain.ts`:

13. **DefiLlama** (ILLIMITÉ, sans clé)
    - GET /tvl/{protocol} — TVL par protocole
    - GET /chains — TVL par blockchain
    - GET /protocol/{name} — détail protocole
    - Si TVL explose → signal bullish pour ce token

14. **Etherscan** (100K calls/jour)
    - GET /api?module=account&action=txlist&address={whale} — transactions whale
    - GET /api?module=stats&action=ethprice — prix ETH
    - GET /api?module=gastracker&action=gasoracle — gas fees (indicateur d'activité)

15. **Dune Analytics** (free tier)
    - Exécuter des queries SQL on-chain prédéfinies
    - Exchange inflows/outflows, holder distribution, whale movements

---

## 🧠 ARCHITECTURE IA — 6 SOUS-AGENTS + COORDINATEUR

### Fichiers à créer dans `lib/agents/`:

```
lib/agents/
├── agent-technique.ts      # Agent 1 — Analyse technique 47 indicateurs
├── agent-sentiment.ts      # Agent 2 — Sentiment (F&G, Reddit, News, YouTube)
├── agent-onchain.ts        # Agent 3 — On-chain (Etherscan, DefiLlama, Dune, liquidations)
├── agent-calendrier.ts     # Agent 4 — Événements (CoinMarketCal, halvings, unlocks)
├── agent-pattern.ts        # Agent 5 — Pattern recognition + corrélations
├── agent-risque.ts         # Agent 6 — Risk management + MIDAS SHIELD
├── coordinator.ts          # Coordinateur — synthèse des 6 votes → décision
├── memory.ts               # Mémoire IA — apprentissage des trades passés
└── types.ts                # Types partagés
```

### Agent 1 — TECHNIQUE (lib/agents/agent-technique.ts)
Calcule 47 indicateurs en JavaScript LOCAL (0€, pas d'API) :
- RSI (14), MACD (12,26,9), Bollinger Bands (20,2)
- EMA 9, 21, 50, 100, 200
- Stochastic RSI, Williams %R, CCI, ADX, ATR
- Fibonacci retracements, Pivot Points
- Ichimoku Cloud, Volume Profile, VWAP
- OBV, MFI, CMF, Force Index
- Parabolic SAR, Donchian Channels
- Elder Ray (Bull/Bear Power)

Multi-timeframe : analyse sur 1m, 5m, 15m, 1h, 4h, 1d simultanément.
Signal valide UNIQUEMENT si 3+ timeframes sont alignés.

### Agent 2 — SENTIMENT (lib/agents/agent-sentiment.ts)
Sources : Alternative.me F&G + Reddit + NewsAPI + YouTube + Google Trends + free-crypto-news
- Score composite sentiment 0-100
- F&G < 20 → marché en peur extrême → opportunité d'achat contrarian
- F&G > 80 → marché euphorique → danger
- Reddit : compter posts positifs vs négatifs dans les 24h
- News : détecter mots-clés (ban, hack, regulation = bearish / ETF, adoption, partnership = bullish)

### Agent 3 — ON-CHAIN (lib/agents/agent-onchain.ts)
Sources : Etherscan + DefiLlama + Dune + Binance aggTrades + Binance Futures liquidations
- Whale movements : aggTrades > 100K$ = alerte
- Liquidations cascade : forceOrder WebSocket → si > 10M$ liquidés en 5min = signal fort
- Funding Rate : > 0.1% = trop bullish (danger), < -0.05% = opportunité
- Open Interest vs Prix : OI monte + prix monte = tendance saine, OI monte + prix baisse = short squeeze imminent
- TVL DeFi : si TVL d'un protocole +20% en 7 jours = bullish
- Exchange inflows : si gros transfert vers exchange = signal de vente potentiel

### Agent 4 — CALENDRIER (lib/agents/agent-calendrier.ts)
Source : CoinMarketCal API
- Halving BTC : historiquement bullish 6-12 mois après
- Token unlock : bearish court terme (pression vendeuse)
- Mainnet launch : bullish si hype
- Exchange listing : bullish court terme
- Score ajustement : +15% bullish si événement positif dans 7 jours, -10% si unlock imminent

### Agent 5 — PATTERN (lib/agents/agent-pattern.ts)
Détection algorithmique de figures chartistes :
- Head & Shoulders, Inverse H&S
- Double top/bottom, Triple top/bottom
- Triangles (ascending, descending, symmetrical)
- Flags, Pennants, Wedges
- Cup & Handle

Corrélations :
- BTC vs altcoins (si BTC pump, altcoins suivent avec délai)
- BTC vs S&P500, DXY (Dollar Index), Or
- Z-score pour mean reversion
- Volatility regime detection (high/low/transition)

### Agent 6 — RISQUE / MIDAS SHIELD (lib/agents/agent-risque.ts)
POUVOIR DE VETO ABSOLU. Si cet agent bloque → le trade est ANNULÉ.
Voir section MIDAS SHIELD ci-dessous.

### COORDINATEUR (lib/agents/coordinator.ts)
Reçoit les résultats JSON des 6 agents. Appelle Claude API avec :

```
Tu es le coordinateur de MIDAS. Tu reçois les analyses de 6 agents spécialisés.

DONNÉES DES AGENTS : [résultats JSON]
CONTEXTE UTILISATEUR : capital, profil risque, positions ouvertes, perte max
MÉMOIRE : [trades passés, patterns gagnants/perdants]

RÈGLES :
1. Trade QUE si score composite > 70%
2. JAMAIS contre la tendance majeure (EMA 200)
3. Préservation du capital > gain
4. Ratio risque/récompense minimum 1:2
5. Diversification : jamais >20% sur un token
6. Si Agent Risque a un VETO → ANNULER le trade

Réponds en JSON : { action, pair, entry, stopLoss, takeProfit, confidence, reasoning }
```

### OPTIMISATION COÛTS IA
- Quick check toutes les 5min avec **haiku** : "Le marché a-t-il bougé significativement ?"
- Deep analysis avec **sonnet** UNIQUEMENT quand le quick check détecte un mouvement
- Résultat : ~20-30 appels sonnet/jour au lieu de 288 = -90% de coût
- Ensemble Decision : 3 appels haiku (bullish/bearish/neutre) + 1 sonnet synthèse = 0.023€/analyse

---

## 🛡️ MIDAS SHIELD — 7 NIVEAUX ANTI-PERTE

NON DÉSACTIVABLE. NON CONTOURNABLE. Chaque trade passe par les 7 filtres.

### Niveau 1 — Position Sizing
```typescript
const positionSize = (capital * riskPercentage) / (entryPrice - stopLossPrice);
// riskPercentage : 0.5%, 1% (default), 2% (max)
// JAMAIS plus de 2% du capital risqué par trade
```

### Niveau 2 — Stop-Loss ATR Dynamique
```typescript
const atr = calculateATR(candles, 14);
const stopLoss = entryPrice - (atr * 2); // multiplier 1.5-3 selon volatilité
// OBLIGATION : chaque trade a un stop-loss. Aucune exception.
```

### Niveau 3 — Drawdown Maximum
- Si perte journalière > 3% du capital → STOP tous les trades pour 24h
- Si perte hebdo > 7% → STOP pour 7 jours
- Si perte totale > 15% → STOP permanent + alerte email

### Niveau 4 — Corrélation Check
- Si déjà exposé sur BTC et qu'un trade altcoin est corrélé à 90% → refuser
- Diversification forcée

### Niveau 5 — Volatilité Filter
- Si volatilité ATR > 2x la moyenne → réduire la taille de 50%
- Si Flash crash détecté (prix -5% en 5min) → couper toutes les positions

### Niveau 6 — Anti-Manipulation
- Pump & dump : volume anormal + prix en flèche sur petit market cap → REFUSER
- Wash trading : volume sans mouvement de prix → flag suspect
- Fake news : si 1 seule source rapporte → flag suspect

### Niveau 7 — Veto Agent Risque
- L'Agent 6 peut bloquer tout trade, quelle que soit la confiance des autres agents
- Si ratio R/R < 1:2 → VETO
- Si capital restant < 50% du capital initial → VETO sur tout sauf DCA

---

## 💰 PRICING — 3 PLANS

### MIDAS FREE — 0€/mois
- Chat IA : 5 questions/jour (haiku)
- Paper trading 50 000$ virtuels avec simulation live
- Dashboard marchés temps réel
- Signaux lecture seule (voir mais pas exécuter)
- 1 exchange, Mode Simple uniquement

### MIDAS PRO — 29€/mois | 233€/an (-33%)
- Chat IA ILLIMITÉ (haiku + sonnet)
- 2 trades auto IA/jour
- Toutes stratégies (DCA, Grid, Momentum, Mean Reversion, Swing, Smart Entry)
- Backtesting 1 an
- MIDAS SHIELD 7 niveaux
- 2 exchanges, Mode Simple + Expert
- Notifications + rapport hebdo email (Resend)

### MIDAS ULTRA — 59€/mois | 474€/an (-33%)
- TOUT Pro
- Trades ILLIMITÉS
- Exchanges ILLIMITÉS
- 6 sous-agents IA activés
- Stratégies exclusives (Scalping, Arbitrage)
- Whale tracking + alertes
- Backtesting 5 ans
- Rapport PDF hebdo
- Copy trading social
- Futures/leverage
- Simulation de marché
- Support prioritaire 4h

---

## 🔄 SYSTÈME DE FALLBACK API (CRITIQUE)

Créer `lib/data/api-manager.ts`:

```typescript
// Tracker de rate limits par API
// Si une API atteint 80% → alerte email à matiss.frasne@gmail.com
// Si une API atteint 100% → fallback automatique sur source alternative
// Cache Supabase : stocker les données pour ne pas re-appeler inutilement

const FALLBACK_MAP = {
  'coinmarketcap': ['coinpaprika', 'binance'],
  'newsapi': ['free-crypto-news', 'reddit'],
  'etherscan': ['dune', 'binance-aggtrades'],
  'coinmarketcal': ['coinpaprika-events'],
  'youtube': ['reddit', 'google-trends'],
};
```

- Cache TTL : prix = 30sec, news = 5min, on-chain = 1min, events = 1h
- Table Supabase `api_usage` : tracker les appels par API par jour

---

## 📱 PAGES ET FONCTIONNALITÉS À COMPLÉTER

### Dashboard — Afficher les données en temps réel :
- Prix live (Binance WebSocket)
- Fear & Greed Index (Alternative.me)
- Top movers (CoinMarketCap)
- Signaux IA actifs (résultat des 6 agents)
- Positions ouvertes + P&L
- Liquidations récentes (Binance Futures WS)

### Chat IA — Enrichir le contexte :
Injecter dans le system prompt du chat :
- Plan utilisateur, positions ouvertes, derniers trades
- Fear & Greed actuel
- News récentes (NewsAPI + free-crypto-news)
- Événements à venir (CoinMarketCal)
- Whale movements récents (Binance aggTrades)

### Page Marchés — Vue complète :
- Liste cryptos avec sparklines (Binance klines)
- Volume 24h, variation, market cap (CoinMarketCap)
- Funding rates (Binance Futures)
- Calendrier événements (CoinMarketCal)
- Sentiment social (Reddit + F&G)

---

## 🔁 CRONS VERCEL (automatisation 24/7)

```
/api/cron/quick-check    → toutes les 5min (haiku) — scan marché rapide
/api/cron/deep-analysis   → quand quick-check détecte un signal (sonnet)
/api/cron/fear-greed      → toutes les heures — update F&G
/api/cron/news-scan       → toutes les 30min — scan NewsAPI + Reddit
/api/cron/events-sync     → 1x/jour — sync CoinMarketCal
/api/cron/whale-tracker   → toutes les 10min — Binance aggTrades gros volumes
/api/cron/memory-learn    → 1x/nuit — backteste les trades du jour, ajuste les poids
/api/cron/report-weekly   → 1x/semaine — génère rapport PDF pour Ultra
```

---

## ⚡ MÉMOIRE IA — APPRENTISSAGE CONTINU

Table Supabase `midas_memory`:
```sql
CREATE TABLE midas_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id),
  predicted_confidence FLOAT,
  actual_outcome TEXT, -- 'win' | 'loss'
  profit_pct FLOAT,
  strategy TEXT,
  pair TEXT,
  market_regime TEXT, -- 'bull' | 'bear' | 'range' | 'crash'
  indicators_snapshot JSONB,
  lesson TEXT, -- résumé IA de ce qu'elle a appris
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Table `midas_calibration` — recalibrage hebdo :
```sql
CREATE TABLE midas_calibration (
  strategy TEXT,
  predicted_range TEXT, -- '70-80%'
  actual_win_rate FLOAT,
  adjustment FLOAT, -- ex: -5% si surestime
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Cron nightly : compare prédictions vs résultats → ajuste les seuils de confiance.

---

## 🔌 DÉTECTION DE RÉGIME MARCHÉ

Créer `lib/trading/market-regime.ts`:

```typescript
type MarketRegime = 'bull' | 'bear' | 'range' | 'crash';

// Détection basée sur :
// - EMA 50 vs EMA 200 (Golden Cross = bull, Death Cross = bear)
// - ATR relatif (ATR actuel / ATR moyen 30j > 2 = crash)
// - Amplitude des chandeliers (range si < 2% sur 7 jours)
// - Fear & Greed < 10 + prix -15% en 7j = crash

// L'IA change de stratégie automatiquement :
// bull → Momentum, Swing, Smart Entry
// bear → DCA defensif, Short (si Ultra)
// range → Grid Trading, Mean Reversion
// crash → TOUT STOPPER, cash mode, attendre
```

---

## ✅ CHECKLIST FINALE — MIDAS EST PARFAIT QUAND :

- [ ] 24 sources de données connectées et fonctionnelles
- [ ] 6 sous-agents IA créés et fonctionnels
- [ ] Agent Coordinateur fonctionne (appel Claude API)
- [ ] MIDAS SHIELD 7 niveaux implémentés et NON contournables
- [ ] Système fallback API opérationnel
- [ ] Cache Supabase pour toutes les données
- [ ] Rate limit tracking avec alerte email à 80%
- [ ] Crons Vercel tous actifs
- [ ] Mémoire IA (tables + cron nightly)
- [ ] Détection régime marché
- [ ] Multi-timeframe 6 niveaux
- [ ] Paper trading par défaut 7 jours
- [ ] Dashboard affiche données temps réel
- [ ] Chat IA enrichi avec contexte marché
- [ ] Toutes les env vars ajoutées dans Vercel
- [ ] 0 erreur build, 0 any, 0 TODO
- [ ] Déployé sur midas.purama.dev
- [ ] Testé dans Safari

SI CETTE CHECKLIST EST 100% COCHÉE → MIDAS EST L'IA DE TRADING LA PLUS PUISSANTE QUI EXISTE.
