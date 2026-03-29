// =============================================================================
// MIDAS — Constants
// Constantes globales de l'application
// =============================================================================

import type { ExchangeName } from '@/types/exchange';
import type { MidasPlan, PlanConfig } from '@/types/stripe';

// --- Super Admin ---

export const SUPER_ADMIN_EMAIL = 'matiss.frasne@gmail.com';

// --- Domain ---

export const DOMAIN = 'purama.dev';
export const APP_SLUG = 'midas';
export const SITE_URL = 'https://midas.purama.dev';

// --- Exchanges ---

export const EXCHANGES: Record<ExchangeName, { display_name: string; logo: string; supports_testnet: boolean; supports_futures: boolean }> = {
  binance: { display_name: 'Binance', logo: '/exchanges/binance.svg', supports_testnet: true, supports_futures: true },
  bybit: { display_name: 'Bybit', logo: '/exchanges/bybit.svg', supports_testnet: true, supports_futures: true },
  okx: { display_name: 'OKX', logo: '/exchanges/okx.svg', supports_testnet: true, supports_futures: true },
  bitget: { display_name: 'Bitget', logo: '/exchanges/bitget.svg', supports_testnet: true, supports_futures: true },
  kucoin: { display_name: 'KuCoin', logo: '/exchanges/kucoin.svg', supports_testnet: true, supports_futures: true },
  gate: { display_name: 'Gate.io', logo: '/exchanges/gate.svg', supports_testnet: false, supports_futures: true },
  mexc: { display_name: 'MEXC', logo: '/exchanges/mexc.svg', supports_testnet: false, supports_futures: true },
  htx: { display_name: 'HTX', logo: '/exchanges/htx.svg', supports_testnet: false, supports_futures: true },
  coinbase: { display_name: 'Coinbase', logo: '/exchanges/coinbase.svg', supports_testnet: false, supports_futures: false },
  kraken: { display_name: 'Kraken', logo: '/exchanges/kraken.svg', supports_testnet: false, supports_futures: true },
};

// --- Strategies ---

export const STRATEGIES = [
  { id: 'trend_following', name: 'Trend Following', description: 'Suit la tendance principale avec confirmation multi-timeframe', risk: 'moderate' },
  { id: 'mean_reversion', name: 'Mean Reversion', description: 'Exploite les retours a la moyenne sur les extremes', risk: 'moderate' },
  { id: 'scalping', name: 'Scalping', description: 'Trades rapides sur petits mouvements avec fort levier', risk: 'aggressive' },
  { id: 'grid', name: 'Grid Trading', description: 'Grille d\'ordres automatique dans un range defini', risk: 'conservative' },
  { id: 'dca', name: 'DCA Intelligent', description: 'Investissement programme avec timing IA optimise', risk: 'conservative' },
  { id: 'momentum', name: 'Momentum', description: 'Capture les accelerations de prix avec volume', risk: 'aggressive' },
  { id: 'breakout', name: 'Breakout', description: 'Detection et execution sur cassures de niveaux cles', risk: 'moderate' },
  { id: 'arbitrage', name: 'Arbitrage', description: 'Exploite les ecarts de prix entre exchanges', risk: 'conservative' },
  { id: 'smart_money', name: 'Smart Money', description: 'Analyse institutionnelle (order blocks, FVG, liquidite)', risk: 'moderate' },
  { id: 'ai_adaptive', name: 'IA Adaptive', description: 'Strategie dynamique pilotee par le coordinateur IA', risk: 'moderate' },
] as const;

// --- Plan Limits ---

export const PLAN_LIMITS: Record<MidasPlan, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Decouvrez MIDAS avec les fonctionnalites essentielles',
    price_monthly: 0,
    price_yearly: 0,
    price_monthly_cents: 0,
    price_yearly_cents: 0,
    stripe_price_monthly_id: null,
    stripe_price_yearly_id: null,
    badge: null,
    is_popular: false,
    cta_label: 'Commencer gratuitement',
    features: [
      { label: '15 questions IA / jour', included: true, highlight: false },
      { label: '5 trades / jour', included: true, highlight: false },
      { label: '1 exchange connecte', included: true, highlight: false },
      { label: '3 positions max', included: true, highlight: false },
      { label: '1 bot actif', included: true, highlight: false },
      { label: 'Analyse technique de base', included: true, highlight: false },
      { label: 'Backtesting', included: false, highlight: false },
      { label: 'Smart Money Analysis', included: false, highlight: false },
      { label: 'Detection de manipulation', included: false, highlight: false },
      { label: 'API access', included: false, highlight: false },
    ],
    limits: {
      daily_questions: 15,
      daily_trades: 5,
      max_exchanges: 1,
      max_positions: 3,
      max_bots: 1,
      backtesting: false,
      paper_trading: true,
      advanced_agents: false,
      smart_money_analysis: false,
      order_flow: false,
      derivatives_analysis: false,
      manipulation_detection: false,
      api_access: false,
      priority_support: false,
      custom_strategies: false,
      export_data: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Pour les traders serieux qui veulent un edge IA',
    price_monthly: 29.99,
    price_yearly: 239.88,
    price_monthly_cents: 2999,
    price_yearly_cents: 23988,
    stripe_price_monthly_id: null,
    stripe_price_yearly_id: null,
    badge: 'Populaire',
    is_popular: true,
    cta_label: 'Passer Pro',
    features: [
      { label: '200 questions IA / jour', included: true, highlight: true },
      { label: '50 trades / jour', included: true, highlight: true },
      { label: '3 exchanges connectes', included: true, highlight: false },
      { label: '10 positions max', included: true, highlight: false },
      { label: '5 bots actifs', included: true, highlight: false },
      { label: 'Backtesting complet', included: true, highlight: true },
      { label: 'Smart Money Analysis', included: true, highlight: true },
      { label: 'Order Flow basique', included: true, highlight: false },
      { label: 'Detection de manipulation', included: false, highlight: false },
      { label: 'API access', included: false, highlight: false },
    ],
    limits: {
      daily_questions: 200,
      daily_trades: 50,
      max_exchanges: 3,
      max_positions: 10,
      max_bots: 5,
      backtesting: true,
      paper_trading: true,
      advanced_agents: true,
      smart_money_analysis: true,
      order_flow: true,
      derivatives_analysis: true,
      manipulation_detection: false,
      api_access: false,
      priority_support: true,
      custom_strategies: true,
      export_data: true,
    },
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    description: 'Puissance maximale, zero limite, edge ultime',
    price_monthly: 79.99,
    price_yearly: 639.88,
    price_monthly_cents: 7999,
    price_yearly_cents: 63988,
    stripe_price_monthly_id: null,
    stripe_price_yearly_id: null,
    badge: 'Edge Max',
    is_popular: false,
    cta_label: 'Devenir Ultra',
    features: [
      { label: 'Questions IA illimitees', included: true, highlight: true },
      { label: 'Trades illimites', included: true, highlight: true },
      { label: 'Exchanges illimites', included: true, highlight: true },
      { label: 'Positions illimitees', included: true, highlight: false },
      { label: 'Bots illimites', included: true, highlight: false },
      { label: 'Tous les agents IA', included: true, highlight: true },
      { label: 'Detection de manipulation', included: true, highlight: true },
      { label: 'API access complet', included: true, highlight: true },
      { label: 'Support prioritaire', included: true, highlight: false },
      { label: 'Strategies custom', included: true, highlight: false },
    ],
    limits: {
      daily_questions: 999999,
      daily_trades: 999999,
      max_exchanges: 999999,
      max_positions: 999999,
      max_bots: 999999,
      backtesting: true,
      paper_trading: true,
      advanced_agents: true,
      smart_money_analysis: true,
      order_flow: true,
      derivatives_analysis: true,
      manipulation_detection: true,
      api_access: true,
      priority_support: true,
      custom_strategies: true,
      export_data: true,
    },
  },
};

// --- Referral ---

export const REFERRAL_COMMISSIONS = {
  filleul_discount_pct: 50,
  parrain_first_payment_pct: 50,
  parrain_recurring_pct: 10,
  parrain_own_discount_pct: 10,
  milestone_bonus_pct: 30,
  milestone_every: 10,
} as const;

// --- Contest ---

export const CONTEST_DISTRIBUTIONS = [25, 18, 14, 10, 8, 7, 6, 5, 4, 3] as const;

export const CONTEST_REVENUE_SHARE = {
  weekly_pct: 2,
  monthly_pct: 5,
} as const;

// --- Wallet ---

export const WALLET_MIN_WITHDRAWAL = 10;
export const WALLET_MAX_WITHDRAWAL = 1000;
export const WALLET_MAX_DAILY_WITHDRAWALS = 1;

// --- Company ---

export const COMPANY_INFO = {
  name: 'Purama',
  legal_name: 'Purama - Micro-entreprise',
  owner: 'Tissma',
  address: 'France',
  email: 'contact@purama.dev',
  tva_notice: 'TVA non applicable, art. 293 B du CGI',
  siret: '',
} as const;

// --- Purama Ecosystem ---

export const PURAMA_APPS = [
  { name: 'JurisPurama', slug: 'jurispurama', description: 'Assistant juridique IA', color: '#6D28D9' },
  { name: 'KAIA', slug: 'kaia', description: 'Bien-etre et meditation', color: '#06B6D4' },
  { name: 'VIDA Sante', slug: 'vida', description: 'Coaching sante IA', color: '#10B981' },
  { name: 'Lingora', slug: 'lingora', description: 'Apprentissage des langues', color: '#3B82F6' },
  { name: 'KASH', slug: 'kash', description: 'Finance personnelle', color: '#F59E0B' },
  { name: 'DONA', slug: 'dona', description: 'Dons et solidarite', color: '#EC4899' },
  { name: 'VOYA', slug: 'voya', description: 'Assistant voyage IA', color: '#38BDF8' },
  { name: 'EntreprisePilot', slug: 'pilot', description: 'Gestion entreprise', color: '#6366F1' },
  { name: 'Impact OS', slug: 'impact', description: 'Impact social', color: '#14B8A6' },
  { name: 'Purama AI', slug: 'ai', description: 'Assistant IA general', color: '#8B5CF6' },
  { name: 'Purama Origin', slug: 'origin', description: 'Creation et design', color: '#D946EF' },
  { name: 'Purama Social', slug: 'social', description: 'Gestion reseaux sociaux', color: '#F97316' },
  { name: 'MIDAS', slug: 'midas', description: 'Trading IA avance', color: '#F59E0B' },
] as const;

// --- Timeframes ---

export const TIMEFRAMES = [
  { value: '1m', label: '1 min' },
  { value: '3m', label: '3 min' },
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '30m', label: '30 min' },
  { value: '1h', label: '1 heure' },
  { value: '2h', label: '2 heures' },
  { value: '4h', label: '4 heures' },
  { value: '6h', label: '6 heures' },
  { value: '8h', label: '8 heures' },
  { value: '12h', label: '12 heures' },
  { value: '1d', label: '1 jour' },
  { value: '3d', label: '3 jours' },
  { value: '1w', label: '1 semaine' },
  { value: '1M', label: '1 mois' },
] as const;

// --- Popular Symbols ---

export const POPULAR_SYMBOLS = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'BNB/USDT',
  'XRP/USDT',
  'ADA/USDT',
  'DOGE/USDT',
  'AVAX/USDT',
  'DOT/USDT',
  'LINK/USDT',
  'MATIC/USDT',
  'UNI/USDT',
  'ATOM/USDT',
  'FIL/USDT',
  'ARB/USDT',
  'OP/USDT',
  'APT/USDT',
  'SUI/USDT',
  'INJ/USDT',
  'TIA/USDT',
] as const;
