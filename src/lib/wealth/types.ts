// =============================================================================
// WEALTH ENGINE V2 — Types
// =============================================================================

export type WalletType = 'principal' | 'boost' | 'emergency' | 'dream' | 'pending' | 'solidaire';

export interface SubWallet {
  type: WalletType;
  balance: number;
  label: string;
  description: string;
  split_pct: number;
  locked_until?: string | null;
  color: string;
}

export const WALLET_SPLITS: Record<WalletType, { pct: number; label: string; desc: string; color: string }> = {
  principal: { pct: 60, label: 'Principal', desc: 'Disponible immediatement', color: '#F59E0B' },
  boost: { pct: 15, label: 'Boost', desc: 'Bloque 30j pour +2%/mois', color: '#7C3AED' },
  emergency: { pct: 10, label: 'Urgence', desc: 'Reserve de securite (plafond 3 mois)', color: '#EF4444' },
  dream: { pct: 10, label: 'Objectif', desc: 'Epargne vers ton objectif', color: '#06B6D4' },
  pending: { pct: 0, label: 'En attente', desc: 'Gains verrouilles (trust score < 70)', color: '#6B7280' },
  solidaire: { pct: 5, label: 'Solidaire', desc: '5% redistribue aux associations', color: '#10B981' },
};

// Revenue split on Stripe income
export const REVENUE_SPLIT = {
  users: 50,   // 50% redistribue aux users
  growth: 10,  // 10% croissance (pub, primes, viralite)
  sasu: 40,    // 40% SASU Purama
} as const;

// Purama Card — 7 niveaux cashback Purity Engine
export type PurityLevel = 'diamant' | 'or' | 'argent' | 'bronze' | 'gris' | 'sombre' | 'noir';

export interface PurityTier {
  level: PurityLevel;
  cashback_pct: number;
  label: string;
  description: string;
  color: string;
  examples: string[];
}

export const PURITY_TIERS: PurityTier[] = [
  { level: 'diamant', cashback_pct: 20, label: 'Diamant', description: 'Achats ethiques premium', color: '#60A5FA', examples: ['Maraichers', 'Herboristeries', 'Permaculture'] },
  { level: 'or', cashback_pct: 15, label: 'Or', description: 'Bio local et bien-etre', color: '#F59E0B', examples: ['Bio local', 'AMAP', 'Yoga', 'Livres'] },
  { level: 'argent', cashback_pct: 10, label: 'Argent', description: 'Consommation responsable', color: '#9CA3AF', examples: ['Bio', 'Seconde main', 'Sport', 'ENR', 'Dons'] },
  { level: 'bronze', cashback_pct: 5, label: 'Bronze', description: 'Achats courants', color: '#CD7F32', examples: ['Courses', 'Pharmacie', 'Services'] },
  { level: 'gris', cashback_pct: 1, label: 'Gris', description: 'Depenses neutres', color: '#6B7280', examples: ['Restaurants', 'Vetements'] },
  { level: 'sombre', cashback_pct: 0, label: 'Sombre', description: 'Depenses non-alignees + alerte', color: '#374151', examples: ['Fast-food', 'Fast-fashion'] },
  { level: 'noir', cashback_pct: 0, label: 'Noir', description: 'Depenses sensibles + question', color: '#111827', examples: ['Alcool', 'Tabac', 'Jeux'] },
];

// Nature Rewards — gains based on healthy activities
export interface NatureReward {
  key: string;
  label: string;
  amount_eur: number;
  unit: string;
  daily_max?: number;
}

export const NATURE_REWARDS: NatureReward[] = [
  { key: 'steps_5k', label: '5 000 pas', amount_eur: 0.25, unit: 'pas' },
  { key: 'steps_10k', label: '10 000 pas', amount_eur: 0.75, unit: 'pas' },
  { key: 'sport_30min', label: '30min sport', amount_eur: 0.50, unit: 'session' },
  { key: 'sport_1h', label: '1h sport', amount_eur: 1.50, unit: 'session' },
  { key: 'meditation', label: 'Meditation', amount_eur: 0.30, unit: 'session' },
  { key: 'sleep_quality', label: 'Sommeil 7-8h', amount_eur: 0.20, unit: 'nuit' },
  { key: 'early_sleep', label: 'Couche avant 23h', amount_eur: 0.10, unit: 'nuit' },
  { key: 'screen_low', label: 'Moins de 2h ecran', amount_eur: 0.50, unit: 'jour' },
  { key: 'reading', label: 'Lecture 30min', amount_eur: 0.30, unit: 'session' },
  { key: 'cooking', label: 'Cuisine maison', amount_eur: 0.20, unit: 'repas' },
  { key: 'healthy_meal', label: 'Repas sain', amount_eur: 0.15, unit: 'repas' },
  { key: 'water_2l', label: '2L eau', amount_eur: 0.10, unit: 'jour' },
  { key: 'planting', label: 'Planter', amount_eur: 1.00, unit: 'action' },
  { key: 'waste_pickup', label: 'Ramassage dechets', amount_eur: 2.00, unit: 'action' },
  { key: 'bike', label: 'Trajet velo', amount_eur: 0.50, unit: 'trajet' },
  { key: 'public_transport', label: 'Transport en commun', amount_eur: 0.20, unit: 'trajet' },
  { key: 'repair', label: 'Reparer un objet', amount_eur: 1.00, unit: 'action' },
  { key: 'help_someone', label: 'Aider quelqu\'un', amount_eur: 0.50, unit: 'action' },
  { key: 'gratitude', label: 'Gratitude', amount_eur: 0.20, unit: 'entree' },
  { key: 'breathing', label: 'Respiration guidee', amount_eur: 0.15, unit: 'session' },
];

export const NATURE_DAILY_CAP = 10; // Max 10 EUR/jour

// 20 Revenue Engines
export interface RevenueEngine {
  id: string;
  name: string;
  description: string;
  active: boolean;
  type: 'passive' | 'active' | 'social' | 'marketplace';
}

export const REVENUE_ENGINES: RevenueEngine[] = [
  { id: 'marketplace', name: 'Marketplace', description: 'Vends tes strategies, templates, signaux (91/9 split)', active: true, type: 'marketplace' },
  { id: 'b2b', name: 'B2B Ethiques', description: 'Missions pour organisations alignees', active: false, type: 'active' },
  { id: 'referral', name: 'Parrainage 3 niveaux', description: 'N1=30% vie, N2=5%, N3=2%', active: true, type: 'social' },
  { id: 'jobs', name: 'Jobs Freelance', description: 'Missions trading/finance (9% commission)', active: false, type: 'active' },
  { id: 'boost', name: 'Boost Fidelite', description: '+2%/mois bloque 30j', active: true, type: 'passive' },
  { id: 'lottery', name: 'Tirages', description: 'Tickets gratuits + bonus abo', active: true, type: 'passive' },
  { id: 'leaderboard', name: 'Classement Top 10', description: 'Recompenses hebdo', active: true, type: 'active' },
  { id: 'prime', name: 'Prime Trimestrielle', description: '5% benefices x Score', active: false, type: 'passive' },
  { id: 'collective', name: 'Intelligence Collective', description: 'Signaux anonymes 70% opt-in', active: true, type: 'social' },
  { id: 'clone', name: 'AI Clone', description: 'Ton clone trade 8h/nuit (91/9)', active: false, type: 'passive' },
  { id: 'skill_graph', name: 'Skill Graph', description: 'Bounties 200-2K EUR', active: false, type: 'active' },
  { id: 'social_impact', name: 'Social Impact Bonds', description: 'Finance externe', active: false, type: 'passive' },
  { id: 'impact_marketplace', name: 'Impact Marketplace', description: 'Associations 5%', active: false, type: 'marketplace' },
  { id: 'energy', name: 'Energy Exchange', description: 'Enedis/RTE externe', active: false, type: 'passive' },
  { id: 'micro_impact', name: 'Micro-Impact', description: '0.1%/tx vers asso', active: true, type: 'passive' },
  { id: 'knowledge', name: 'Open Knowledge', description: 'Royalties sur contenu', active: false, type: 'marketplace' },
  { id: 'health', name: 'Health Insights', description: 'Donnees anonymes 50% opt-in', active: false, type: 'passive' },
  { id: 'neural', name: 'Neural Marketplace', description: 'Commandes garanties', active: false, type: 'marketplace' },
  { id: 'learn', name: 'Learn-to-Earn', description: 'Module=0.50-5 EUR, certif=100-500 EUR', active: false, type: 'active' },
  { id: 'bridges', name: 'Bridges APIs', description: 'Ecosia, TGTG, Strava 2-5%', active: false, type: 'passive' },
];
