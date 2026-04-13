# MIDAS ULTIMATE — AI Omniscient Trading & Wealth Engine
## Brief V3.0 — GOD MODE

---

## 1. VISION

MIDAS est la machine de création de richesse la plus puissante jamais conçue. Un système multi-agents IA qui trade, investit, et génère des revenus 24/7 sur Binance avec une intelligence omnisciente connectée à 35+ sources de données mondiales. L'utilisateur branche son API Binance, choisit son montant, et MIDAS fait tout le reste.

**URL Production :** midas.purama.dev
**Stack :** Next.js + Supabase (auth.purama.dev) + Stripe + Binance API + Claude API + 35+ APIs de données
**Referral Binance :** CPA_00BM2GEU29 (https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00BM2GEU29)

---

## 2. ARCHITECTURE MULTI-AGENTS

MIDAS fonctionne avec 9 agents IA spécialisés qui tournent en parallèle. Chaque agent fait UNE chose parfaitement. Ils communiquent via Redis et votent ensemble pour chaque décision.

### 2.1 AGENT MAÎTRE — Le Cerveau
- Ne trade pas lui-même
- Reçoit les rapports de tous les sous-agents
- Fait voter les stratégies entre elles
- Prend la décision finale uniquement quand le consensus atteint 85%+ de confiance
- Si aucun consensus → ne fait rien (ne rien faire est une stratégie)
- Orchestre le démarrage, l'arrêt, et la surveillance de tous les agents

### 2.2 AGENT MARKET DATA — Le Radar
- WebSocket Binance temps réel : prix, volumes, carnet d'ordres en profondeur, trades, liquidations
- Données CoinGecko + CoinMarketCap : 10 000+ cryptos
- TradingView : 200+ indicateurs techniques
- Calcul de tous les indicateurs : RSI, MACD, Bollinger, Ichimoku, Volume Profile, Order Flow, etc.
- Détection de patterns chartistes par IA (triangles, double tops, head & shoulders, etc.)
- Intervalle : temps réel (millisecondes)

### 2.3 AGENT ON-CHAIN — Le Détective
- CryptoQuant : flux exchanges, miners, UTXO, réserves
- IntoTheBlock : concentration holders, in/out of money, large transactions
- Blockchain.com : hashrate, difficulté, mempool Bitcoin
- Bitquery GraphQL : tracking de n'importe quel wallet sur 40+ blockchains
- Whale Alert : mouvements massifs en temps réel
- Dune Analytics : requêtes SQL on-chain
- Etherscan + BscScan : transactions temps réel, smart contracts
- Détection : whale dépose sur exchange → vente probable / whale retire → hodl signal
- Intervalle : toutes les 30 secondes

### 2.4 AGENT SENTIMENT — Le Psychologue
- Reddit API : r/CryptoCurrency, r/Bitcoin, r/wallstreetbets, subreddits par crypto
- Twitter/X API : tweets influenceurs crypto, hashtags trending, analyse sentiment
- CryptoPanic : news agrégées avec sentiment bullish/bearish
- LunarCrush : social intelligence 4000+ cryptos
- Alternative.me Fear & Greed Index
- Telegram Bot API : surveillance groupes crypto publics
- Analyse NLP par Claude API du sentiment global
- Détection d'emballement (FOMO) et de panique (FUD)
- Intervalle : toutes les 5 minutes

### 2.5 AGENT MACRO — L'Économiste
- FRED (Federal Reserve) : taux, inflation, emploi, PIB, masse monétaire US
- ECB : politique monétaire zone euro
- World Bank : données 195 pays
- Alpha Vantage : actions, forex, commodities, indicateurs
- OECD : données pays développés, prévisions
- Calendrier économique : décisions de taux, publications data, discours banquiers centraux
- SEC EDGAR : insider trading déclaré, 13F filings hedge funds
- Google Patents : brevets déposés (signal sur entreprises)
- Corrélation BTC/actions/or/DXY/taux analysée en continu
- Intervalle : toutes les heures

### 2.6 AGENT DEFI — L'Explorateur
- DefiLlama : TVL tous protocoles, yields, stablecoins flows, bridges
- DeFi Safety : scores de sécurité des protocoles
- L2Beat : données Layer 2 Ethereum
- Binance Earn : Simple Earn, Locked, Launchpool, Launchpad, Dual Investment, BNB Vault, Liquidity Farming
- Détection des meilleures opportunités de rendement passif
- Analyse risque/rendement de chaque protocole et produit
- Token Unlocks : calendrier des déverrouillages de tokens
- Intervalle : toutes les 15 minutes

### 2.7 AGENT RISK — Le Garde du Corps
- **A UN DROIT DE VETO SUR TOUT TRADE**
- Surveille en continu : exposition totale, corrélations, drawdown, volatilité
- Règles absolues :
  - Jamais plus de 1% du capital sur un seul trade
  - Jamais plus de 10% sur un seul asset
  - Jamais plus de 25% sur un seul secteur
  - Stop-loss dynamique sur chaque position
  - Si perte de 5% en un jour → fermeture totale + pause 48h
  - Si perte de 10% en un mois → mode conservateur
  - Si black swan détecté → 100% stablecoins en 30 secondes
- Hedging automatique : position inverse ouverte si risque trop élevé
- Stress test permanent : simule crash de 50% et ajuste en conséquence
- Détection de flash crash en 50ms avec sortie automatique
- Détection de manipulation de marché (spoofing, wash trading)
- Intervalle : temps réel

### 2.8 AGENT EXECUTION — Le Sniper
- Reçoit les ordres validés par le Maître + Risk
- Exécute sur Binance avec la route la moins chère
- Limit orders > Market orders quand possible (maker vs taker)
- Découpage intelligent des gros ordres pour minimiser le slippage
- Routing via paires intermédiaires si les frais sont inférieurs
- Accumulation stratégique de BNB pour la réduction de 25% des frais
- Timing d'exécution optimisé (évite les moments de spread élevé)
- Mode Sniper Listing : achat en millisecondes sur les nouveaux listings
- Intervalle : temps réel (millisecondes)

### 2.9 AGENT MÉMOIRE — L'Historien
- Stocke chaque trade, chaque signal, chaque erreur, chaque condition de marché
- Base de données Supabase pour la persistance long-terme
- Cache Redis pour les requêtes rapides des autres agents
- Analyse rétrospective : pourquoi un trade a gagné/perdu
- Détection de drift de stratégie (quand une stratégie perd son edge)
- Mémoire de 100 ans de données historiques de marchés
- Reconnaissance de patterns similaires à des situations passées
- Intervalle : asynchrone (ne ralentit personne)

---

## 3. CONNEXION BINANCE COMPLÈTE

### 3.1 Onboarding
- L'utilisateur crée un compte Binance via le referral CPA_00BM2GEU29
- L'utilisateur génère une API Key + Secret sur Binance
- Configuration : trade-only (JAMAIS de retrait), whitelist IP activée
- MIDAS se connecte et lit instantanément : solde, positions, historique, staking, ordres

### 3.2 Contrôle du Capital
- Slider simple : l'utilisateur choisit le montant que MIDAS peut utiliser
- Modification en 1 tap à tout moment
- Bouton pause instantané
- Retrait de gains en 1 tap
- Mode "ne touche à rien" : gel total instantané

### 3.3 Allocation Intelligente par Palier
- 0-500€ : staking, funding rate farming, arbitrage spot uniquement
- 500-5000€ : + grid trading, arbitrage inter-paires, trading directionnel haute confiance
- 5000-50000€ : + toutes stratégies en parallèle, diversification maximale
- 50000€+ : + fragmentation d'ordres, stratégies institutionnelles, multi-sous-comptes

### 3.4 Exploitation Maximale de Binance
- Spot, Futures, Margin
- Simple Earn (flexible + locked)
- Launchpool + Launchpad (détection et participation automatique)
- Dual Investment
- Liquidity Farming
- BNB Vault (BNB inutilisé → revenus pendant qu'il paie les frais)
- Auto-Invest DCA intelligent
- ETH Staking
- Zéro argent qui dort : chaque centime est placé quelque part entre deux trades

### 3.5 Sécurité API
- Mode trade-only, jamais de retrait
- Whitelist IP activée
- Détection de comportement anormal
- Alerte immédiate si tentative de modification des paramètres API
- Les fonds restent sur Binance sous le contrôle absolu de l'utilisateur

---

## 4. STRATÉGIES DE TRADING

### 4.1 Stratégies Quasi Sans Risque (70% du capital)
- **Arbitrage spot** : différences de prix entre paires Binance
- **Funding rate farming** : encaisser le funding en position neutre
- **Grid trading** : ordres d'achat/vente en grille sur les ranges
- **Staking optimisé** : meilleur rendement entre les produits Earn
- **DCA intelligent** : investissement dynamique (plus en bear, moins en bull)
- **Market making** : fournir de la liquidité avec spread garanti

### 4.2 Stratégies Directionnelles (20% du capital)
- Trading haute confiance uniquement (consensus 85%+ entre agents)
- Entrée et sortie au moment mathématiquement optimal
- 2-3 trades max par jour (qualité > quantité)
- Combinaison analyse technique + on-chain + sentiment + macro
- Copy-trading inversé : fait l'opposé des traders retail perdants

### 4.3 Stratégies Événementielles
- Sniper de nouveaux listings Binance
- Participation automatique Launchpool/Launchpad
- Positionnement avant les annonces macro (taux, inflation)
- Sortie avant les token unlocks massifs
- Achat lors des capitulations (Fear & Greed < 10)

### 4.4 Réserve Intouchable (10% du capital)
- Jamais tradée, jamais touchée
- Stablecoins ou Bitcoin en cold storage Binance
- Filet de sécurité absolu

---

## 5. INTELLIGENCE PRÉDICTIVE

### 5.1 Signaux Satellites & Physiques
- NASA EONET : événements naturels (ouragans, feux → commodities)
- Données de trafic maritime (Spire Global si budget le permet)
- Images satellites parkings / activité économique (Orbital Insight si budget)

### 5.2 Signaux Corporate & Institutionnels
- SEC EDGAR : ce que Blackrock, Citadel, les hedge funds achètent
- Google Patents : brevets déposés → signal sur entreprises
- Recrutements massifs dans un secteur → signal de croissance
- Insider trading déclaré : quand les PDG vendent → attention

### 5.3 Signaux On-Chain Avancés
- Whale dépose sur exchange → vente imminente → MIDAS sort
- Whale retire de l'exchange → hodl → signal bullish
- Flux stablecoins vers exchanges → pression acheteuse arrive
- Concentration de liquidations → le prix va chercher ces niveaux
- Age of coins : si les vieux BTC bougent → les OG vendent → attention

### 5.4 Prédiction Événementielle
- CEO annule ses vacances → annonce majeure imminente
- Entreprise embauche des avocats massivement → procès ou régulation
- Gouvernement achète de l'or → dévaluation probable
- Recherches Google "how to go bankrupt" explosent → récession

---

## 6. FONCTIONNALITÉS UTILISATEUR

### 6.1 Modes de Fonctionnement
- **Mode Pilote Automatique** : l'utilisateur ne fait rien, MIDAS gère tout
- **Mode Revenus Passifs Purs** : zéro trading directionnel, uniquement staking/earn/farming
- **Mode Semi-Auto** : MIDAS propose, l'utilisateur valide
- **Mode Paper Trading** : simulation avec argent fictif sur données réelles
- **Profils de risque** : conservateur, modéré, agressif, ultra-agressif

### 6.2 Confiance Progressive
- Début en mode ultra-conservateur
- Paper trading en parallèle du mode plus agressif (l'utilisateur voit les deux résultats)
- L'utilisateur augmente l'agressivité progressivement quand il est en confiance
- Jamais forcé, toujours à son rythme

### 6.3 Backtesting
- Chaque stratégie testée sur 10 ans de données historiques
- Survie aux crashs 2018, 2020, 2022, 2025 vérifiée
- Résultats historiques visibles : gains, pertes, drawdown max, recovery time
- Transparence totale avant de risquer 1€ réel

### 6.4 Dashboard Temps Réel
- Portefeuille total au centime près
- P&L en temps réel
- Performance vs BTC, vs S&P 500, vs HODL simple
- Carte des positions actives
- Flux de trades en direct
- Historique de chaque décision avec explication IA
- Prédiction patrimoine 1/5/10/20 ans
- Revenu passif mensuel généré
- Score de santé du portefeuille
- Compte à rebours vers la liberté financière

### 6.5 Alertes & Rapports
- Notification pour chaque trade avec explication
- Résumé quotidien 30 secondes
- Résumé hebdomadaire détaillé avec graphiques
- Résumé mensuel avec comparaisons
- Rapport fiscal annuel automatique (formulaire 2086 prérempli pour la France)

### 6.6 Social & Gamification
- Intelligence collective : les MIDAS de tous les utilisateurs partagent anonymement leurs signaux
- Classement anonyme par performance
- Challenges communautaires mensuels
- Partage de stratégies gagnantes vérifiées
- Mentorat automatique : utilisateurs avancés coachent les nouveaux

---

## 7. PROTECTION & SÉCURITÉ

### 7.1 Anti-Perte de Capital
- Jamais plus de 1% sur un seul trade
- Stop-loss dynamique sur chaque position
- Capital sacré intouchable (10%)
- Mode survie automatique (5% perte/jour → arrêt total)
- Hedging permanent des positions risquées

### 7.2 Anti-Hack
- API Binance trade-only, jamais de retrait
- Whitelist IP
- Détection de comportement anormal
- Auth Supabase + 2FA
- Chiffrement de toutes les clés API

### 7.3 Anti-Bug
- 9 agents indépendants : si un crash, les autres continuent
- Heartbeat toutes les 10 secondes par agent
- Auto-restart en 5 secondes via pm2/Docker
- 3 redémarrages ratés → mode safe (100% stablecoins) + alerte critique
- Rolling update : mise à jour sans arrêt du service
- Logs complets de chaque décision pour audit

---

## 8. INFRASTRUCTURE TECHNIQUE

### 8.1 Stack Backend
- **Runtime** : Node.js (agents en workers indépendants)
- **Communication inter-agents** : Redis (pub/sub + cache)
- **File d'attente** : BullMQ (tâches persistantes même en cas de crash)
- **Base de données** : Supabase (PostgreSQL) pour la persistance
- **Process manager** : pm2 avec auto-restart
- **Monitoring** : Uptime Kuma + alertes Telegram/email

### 8.2 Hébergement
- Phase 1 : VPS Hostinger KVM8 existant (72.62.191.111)
- Phase 2 (si charge > 70%) : VPS dédié KVM4 pour MIDAS uniquement
- Redis sur le même VPS que les agents
- Supabase sur auth.purama.dev (déjà en place)

### 8.3 Rate Limiting & Cache
- Chaque agent connaît les limites de ses APIs
- File d'attente prioritaire : données critiques en premier
- Cache intelligent : données lentes (macro) cachées / données temps réel jamais cachées
- Division par 10 du nombre de requêtes API sans perte de qualité

### 8.4 WebSockets Binance
- Connexion permanente aux streams : ticker, depth, trades, liquidations
- Reconnexion automatique en cas de déconnexion
- Buffer des données pendant la reconnexion (rien n'est perdu)

---

## 9. APIs À CONNECTER

### 9.1 Données de Marché (GRATUIT)
| API | Usage | Limite gratuite |
|-----|-------|-----------------|
| Binance WebSocket | Prix, orderbook, trades temps réel | Illimité avec API key |
| CoinGecko | Prix, volumes, market cap 10 000+ cryptos | 500 calls/min |
| CoinMarketCap | Rankings, listings, airdrops | 333 calls/jour |
| Alpha Vantage | Actions, forex, commodities | 25 calls/jour |

### 9.2 Intelligence On-Chain (GRATUIT)
| API | Usage | Limite gratuite |
|-----|-------|-----------------|
| CryptoQuant | Flux exchanges, miners, réserves | Tier gratuit |
| IntoTheBlock | Holders, transactions, ML metrics | Tier gratuit |
| Blockchain.com | Hashrate, difficulté, mempool BTC | Illimité |
| Bitquery GraphQL | Tracking wallets 40+ blockchains | 10 000 pts/mois |
| Whale Alert | Mouvements massifs temps réel | Tier gratuit |
| Dune Analytics | Requêtes SQL on-chain | Tier gratuit |
| Etherscan | Transactions ETH temps réel | 5 calls/sec |
| BscScan | Transactions BSC temps réel | 5 calls/sec |

### 9.3 Sentiment & Actualités (GRATUIT)
| API | Usage | Limite gratuite |
|-----|-------|-----------------|
| Tavily | Recherche web temps réel | Clé déjà disponible |
| CryptoPanic | News crypto + sentiment | Gratuit |
| Reddit API | Sentiment subreddits crypto | Gratuit |
| LunarCrush | Social intelligence 4000+ cryptos | Tier gratuit |
| Alternative.me | Fear & Greed Index | Illimité |

### 9.4 Macro-Économie (GRATUIT)
| API | Usage | Limite gratuite |
|-----|-------|-----------------|
| FRED | Données économiques US | Illimité |
| ECB | Politique monétaire EUR | Illimité |
| World Bank | Données 195 pays | Illimité |
| OECD | Données pays développés | Illimité |
| SEC EDGAR | Insider trading, 13F filings | Illimité |
| Google Patents | Brevets déposés | Illimité |
| NASA EONET | Événements naturels | Illimité |

### 9.5 DeFi & Derivatives (GRATUIT)
| API | Usage | Limite gratuite |
|-----|-------|-----------------|
| DefiLlama | TVL, yields, stablecoins flows | Illimité (open source) |
| DeFi Safety | Scores sécurité protocoles | Gratuit |
| L2Beat | Données Layer 2 ETH | Gratuit |
| CoinGlass | Open interest, liquidations, funding | Tier gratuit |
| Coinalyze | OI + funding tous exchanges | Tier gratuit |
| Token Unlocks | Calendrier déverrouillages tokens | Gratuit |
| Messari | Recherche institutionnelle | Tier gratuit |

### 9.6 Optionnelles Payantes (Phase 2+)
| API | Usage | Prix |
|-----|-------|------|
| Nansen | Smart money tracking | ~$100/mois |
| Santiment | Social + dev activity | ~$49/mois |
| Twitter/X API | Tweets influenceurs temps réel | ~$100/mois |
| TradingView | Screeners, indicateurs avancés | ~$15/mois |
| Orbital Insight | Images satellites | Sur devis |
| Spire Global | Trafic maritime | Sur devis |

---

## 10. PAGES & FONCTIONNALITÉS UI

### 10.1 Pages Publiques
1. **Landing Page** (/) — Présentation MIDAS, stats en temps réel, CTA inscription
2. **Pricing** (/pricing) — Gratuit / Premium / Whale
3. **Login/Register** (/auth) — Supabase Auth + Google OAuth

### 10.2 Pages Dashboard (Authentifié)
4. **Dashboard Principal** (/dashboard) — Vue d'ensemble : portefeuille, P&L, score santé, compte à rebours liberté financière
5. **Portfolio** (/portfolio) — Détail de chaque position, allocation, performance par asset
6. **Trades** (/trades) — Historique complet, explication IA de chaque trade, filtres
7. **Stratégies** (/strategies) — Vue des 9 agents, leur statut, leurs signaux, votes en cours
8. **Signaux** (/signals) — Feed temps réel des signaux détectés (on-chain, sentiment, macro, etc.)
9. **Paper Trading** (/paper) — Mode simulation, résultats fictifs, comparaison avec le mode réel
10. **Backtesting** (/backtest) — Test de stratégies sur données historiques
11. **Earn** (/earn) — Staking, farming, Binance Earn, rendements passifs
12. **Paramètres** (/settings) — API Binance, slider capital, profil risque, notifications, mode

### 10.3 Pages Communauté
13. **Leaderboard** (/leaderboard) — Classement anonyme, challenges, mentorat
14. **Stratégies Partagées** (/community) — Stratégies gagnantes de la communauté

### 10.4 Pages Admin (Super Admin)
15. **Admin Dashboard** (/admin) — Utilisateurs, métriques globales, revenus, agents status
16. **Agent Monitor** (/admin/agents) — Santé de chaque agent, logs, heartbeats, alertes
17. **API Monitor** (/admin/apis) — Statut de chaque API, rate limits, erreurs

---

## 11. SUPABASE SCHEMA

### Tables

```sql
-- Utilisateurs (extension de auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  binance_api_key_encrypted TEXT,
  binance_api_secret_encrypted TEXT,
  binance_api_connected BOOLEAN DEFAULT false,
  risk_profile TEXT DEFAULT 'moderate' CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive', 'ultra')),
  trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'passive', 'semi_auto', 'auto')),
  capital_allocated DECIMAL(20,8) DEFAULT 0,
  capital_reserved_pct INTEGER DEFAULT 10,
  is_premium BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portefeuille temps réel
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  total_value_usdt DECIMAL(20,8),
  total_pnl_usdt DECIMAL(20,8),
  total_pnl_pct DECIMAL(10,4),
  assets JSONB, -- détail par asset
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades exécutés
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  type TEXT NOT NULL CHECK (type IN ('spot', 'futures', 'margin', 'earn', 'launchpool')),
  strategy TEXT NOT NULL,
  entry_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  quantity DECIMAL(20,8),
  pnl_usdt DECIMAL(20,8),
  pnl_pct DECIMAL(10,4),
  fees_usdt DECIMAL(20,8),
  confidence_score DECIMAL(5,2),
  agents_consensus JSONB, -- vote de chaque agent
  ai_explanation TEXT, -- explication Claude de pourquoi ce trade
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  binance_order_id TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Signaux détectés
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL, -- quel agent a détecté
  signal_type TEXT NOT NULL, -- whale_move, sentiment_shift, macro_event, etc.
  symbol TEXT,
  direction TEXT CHECK (direction IN ('bullish', 'bearish', 'neutral')),
  confidence DECIMAL(5,2),
  data JSONB, -- données brutes du signal
  acted_on BOOLEAN DEFAULT false,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status des agents
CREATE TABLE agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'stopped', 'error', 'safe_mode')),
  last_heartbeat TIMESTAMPTZ,
  last_error TEXT,
  metrics JSONB, -- CPU, RAM, requêtes/min, etc.
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Earn / Staking positions
CREATE TABLE earn_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  product_type TEXT NOT NULL, -- simple_earn, locked, launchpool, bnb_vault, etc.
  asset TEXT NOT NULL,
  amount DECIMAL(20,8),
  apy DECIMAL(10,4),
  daily_reward DECIMAL(20,8),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active'
);

-- Paper trades (simulation)
CREATE TABLE paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  strategy TEXT NOT NULL,
  entry_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  quantity DECIMAL(20,8),
  pnl_usdt DECIMAL(20,8),
  pnl_pct DECIMAL(10,4),
  confidence_score DECIMAL(5,2),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Backtesting results
CREATE TABLE backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  strategy TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  initial_capital DECIMAL(20,8),
  final_capital DECIMAL(20,8),
  total_trades INTEGER,
  win_rate DECIMAL(5,2),
  max_drawdown DECIMAL(10,4),
  sharpe_ratio DECIMAL(10,4),
  vs_hodl_btc DECIMAL(10,4),
  vs_sp500 DECIMAL(10,4),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community leaderboard
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  period TEXT NOT NULL, -- weekly, monthly, all_time
  pnl_pct DECIMAL(10,4),
  total_trades INTEGER,
  win_rate DECIMAL(5,2),
  rank INTEGER,
  badge TEXT, -- bronze, silver, gold, whale
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rapports fiscaux
CREATE TABLE tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  year INTEGER NOT NULL,
  country TEXT DEFAULT 'FR',
  total_gains DECIMAL(20,8),
  total_losses DECIMAL(20,8),
  net_taxable DECIMAL(20,8),
  form_data JSONB, -- données pour formulaire 2086
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL, -- trade_executed, alert, daily_summary, etc.
  title TEXT,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  stripe_payment_id TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'eur',
  status TEXT,
  plan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies
- Chaque utilisateur ne voit QUE ses propres données
- Les super admins voient tout
- Le leaderboard est public mais anonymisé
- Les signaux sont partagés entre utilisateurs premium

---

## 12. API ROUTES

```
# Auth
POST /api/auth/callback — Supabase OAuth callback

# Binance
POST /api/binance/connect — Connecter API Binance
GET  /api/binance/balance — Solde temps réel
GET  /api/binance/positions — Positions ouvertes
POST /api/binance/capital — Modifier le capital alloué
POST /api/binance/pause — Pause/Resume trading

# Trading
GET  /api/trades — Historique des trades
GET  /api/trades/:id — Détail d'un trade avec explication IA
GET  /api/trades/stats — Statistiques globales

# Agents
GET  /api/agents/status — Statut de tous les agents
GET  /api/agents/:name/signals — Signaux d'un agent
GET  /api/agents/consensus — Vote en cours

# Signaux
GET  /api/signals — Feed de signaux temps réel
GET  /api/signals/:type — Signaux par type

# Portfolio
GET  /api/portfolio — Snapshot actuel
GET  /api/portfolio/history — Historique des snapshots
GET  /api/portfolio/prediction — Prédiction 1/5/10/20 ans

# Earn
GET  /api/earn — Positions earn actives
GET  /api/earn/opportunities — Meilleures opportunités actuelles
POST /api/earn/auto-allocate — Allocation automatique

# Paper Trading
GET  /api/paper/trades — Trades simulés
GET  /api/paper/stats — Performance paper vs réel

# Backtesting
POST /api/backtest/run — Lancer un backtest
GET  /api/backtest/results — Résultats

# Community
GET  /api/leaderboard — Classement
GET  /api/community/strategies — Stratégies partagées

# Tax
GET  /api/tax/:year — Rapport fiscal
GET  /api/tax/:year/download — Télécharger formulaire 2086

# Notifications
GET  /api/notifications — Notifications utilisateur
POST /api/notifications/read — Marquer comme lues

# Admin
GET  /api/admin/dashboard — Métriques globales
GET  /api/admin/agents — Monitoring agents
GET  /api/admin/users — Liste utilisateurs
GET  /api/admin/apis — Statut APIs externes

# Stripe
POST /api/stripe/checkout — Créer session de paiement
POST /api/stripe/webhook — Webhook Stripe
GET  /api/stripe/portal — Portail de gestion abonnement
```

---

## 13. AGENTS BACKEND — WORKERS

Chaque agent est un worker Node.js indépendant géré par pm2.

```
/workers/
  agent-master.js        — Cerveau central, orchestrateur
  agent-market-data.js   — WebSocket Binance + CoinGecko + CMC
  agent-onchain.js       — CryptoQuant + IntoTheBlock + Whale Alert + etc.
  agent-sentiment.js     — Reddit + CryptoPanic + LunarCrush + Fear&Greed
  agent-macro.js         — FRED + ECB + SEC EDGAR + Patents
  agent-defi.js          — DefiLlama + DeFi Safety + L2Beat + Token Unlocks
  agent-risk.js          — Garde du corps, droit de veto
  agent-execution.js     — Exécution Binance, routing optimal
  agent-memory.js        — Stockage, analyse rétrospective
```

Chaque agent :
- A son propre process pm2
- Envoie un heartbeat Redis toutes les 10 secondes
- Publie ses signaux sur un channel Redis dédié
- Écoute les commandes du Master sur un channel Redis
- Log chaque action dans Supabase
- Auto-restart en cas de crash

---

## 14. PRICING

### Gratuit
- Paper trading illimité
- 1 stratégie active
- Résumé hebdomadaire
- Earn basique (staking simple)

### Premium (19€/mois)
- Trading réel automatique
- Toutes les stratégies
- 9 agents actifs
- Résumés quotidiens
- Rapport fiscal
- Intelligence collective
- Earn avancé (toutes les stratégies)

### Whale (49€/mois)
- Tout Premium +
- API prioritaire (exécution plus rapide)
- Signaux exclusifs (on-chain avancé)
- Backtesting illimité
- Support prioritaire
- Badge Whale sur le leaderboard

---

## 15. ENV VARS REQUISES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://auth.purama.dev
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Binance
BINANCE_REFERRAL_CODE=CPA_00BM2GEU29

# Claude API (pour les explications IA)
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Redis
REDIS_URL=redis://localhost:6379

# APIs Marché
COINGECKO_API_KEY=
COINMARKETCAP_API_KEY=
ALPHA_VANTAGE_API_KEY=

# APIs On-Chain
CRYPTOQUANT_API_KEY=
INTOTHEBLOCK_API_KEY=
BITQUERY_API_KEY=
WHALE_ALERT_API_KEY=
ETHERSCAN_API_KEY=
BSCSCAN_API_KEY=

# APIs Sentiment
TAVILY_API_KEY=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
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
LUNARCRUSH_API_KEY=
CRYPTOPANIC_API_KEY=

# APIs Macro
FRED_API_KEY=

# APIs DeFi (pas de clé nécessaire pour la plupart)
# DefiLlama, DeFi Safety, L2Beat, CoinGlass = gratuit sans clé

# Monitoring
UPTIME_KUMA_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=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
```

---

## 16. COMMANDES DE LANCEMENT

```bash
# Setup initial
mkdir ~/purama/midas && cd ~/purama/midas
cp ~/purama/CLAUDE.md .
cp ~/purama/MIDAS-ULTIMATE-BRIEF.md .
claude --dangerously-skip-permissions

# PM2 pour les agents (créé automatiquement par Claude Code)
pm2 start workers/agent-master.js --name midas-master
pm2 start workers/agent-market-data.js --name midas-market
pm2 start workers/agent-onchain.js --name midas-onchain
pm2 start workers/agent-sentiment.js --name midas-sentiment
pm2 start workers/agent-macro.js --name midas-macro
pm2 start workers/agent-defi.js --name midas-defi
pm2 start workers/agent-risk.js --name midas-risk
pm2 start workers/agent-execution.js --name midas-execution
pm2 start workers/agent-memory.js --name midas-memory
pm2 save
pm2 startup
```

---

## 17. DESIGN

Suivre les directives de CLAUDE-2.md (PURAMA GOD MODE V3) — sections 9, 9bis, 9ter. Ne jamais improviser le design.

Thème : sombre, professionnel, doré. MIDAS = richesse = or + noir.
Animations fluides sur les données temps réel.
Dashboard style Bloomberg Terminal mais 100x plus simple et beau.

---

## 18. TESTS

Suivre le framework de test 5 niveaux de CLAUDE.md V12 :
1. **Unit** — Chaque fonction de chaque agent
2. **Feature** — Chaque stratégie de trading isolée
3. **Integration** — Communication inter-agents via Redis
4. **E2E** — Playwright : connexion Binance → trade → dashboard
5. **CLIENT-SIM** — 21 scénarios utilisateur complets

---

## 19. PRIORITÉ D'IMPLÉMENTATION

### Phase 1 — MVP (semaine 1-2)
- Auth + profils + connexion Binance API
- Dashboard basique (solde, positions)
- Agent Market Data (WebSocket Binance)
- Agent Execution (ordres basiques)
- Agent Risk (stop-loss, limites)
- Paper Trading
- Mode revenus passifs (Binance Earn)

### Phase 2 — Intelligence (semaine 3-4)
- Agent On-Chain (CryptoQuant, Whale Alert)
- Agent Sentiment (Fear & Greed, CryptoPanic, Reddit)
- Agent Macro (FRED, calendrier économique)
- Agent Mémoire
- Agent Maître (consensus et vote)
- Stratégies de trading directionnelles
- Backtesting

### Phase 3 — Complet (semaine 5-6)
- Agent DeFi
- Arbitrage
- Sniper listings
- Launchpool automatique
- Dashboard avancé (prédictions, graphiques)
- Rapport fiscal
- Notifications
- Leaderboard + communauté
- Stripe + plans premium

### Phase 4 — Scale (semaine 7+)
- APIs payantes optionnelles
- Intelligence collective entre utilisateurs
- Optimisation performance
- Apps mobiles
- APIs supplémentaires (satellites, etc.)
