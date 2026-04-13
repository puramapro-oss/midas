export type MidasPlan = 'free' | 'pro' | 'ultra';
export type BillingPeriod = 'monthly' | 'yearly';

export interface PlanLimits {
  dailyQuestions: number;
  dailyTrades: number;
  maxExchanges: number;
  maxPositions: number;
  backtestMonths: number;
}

export interface PlanConfig {
  name: string;
  price: { monthly: number; yearly: number };
  priceId: { monthly: string; yearly: string };
  features: string[];
  limits: PlanLimits;
  badge?: string;
}

export const PLANS: Record<MidasPlan, PlanConfig> = {
  free: {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    priceId: { monthly: '', yearly: '' },
    features: [
      'Vue marché temps réel',
      '5 questions IA par jour',
      '1 exchange connecté',
      '5 positions suivies',
    ],
    limits: {
      dailyQuestions: 5,
      dailyTrades: 0,
      maxExchanges: 1,
      maxPositions: 5,
      backtestMonths: 0,
    },
  },
  pro: {
    name: 'Pro',
    price: { monthly: 39, yearly: 313 },
    priceId: {
      monthly: 'price_1THWUp4Y1unNvKtXuZlp8xqD',
      yearly: 'price_1THWUp4Y1unNvKtX7WXhszjM',
    },
    features: [
      'Questions IA illimitees',
      '30 trades automatiques par jour',
      '2 exchanges connectes',
      '5 positions simultanees',
      'Backtest 12 mois',
      'Alertes avancees',
      'Signaux de trading',
    ],
    limits: {
      dailyQuestions: 999999,
      dailyTrades: 30,
      maxExchanges: 2,
      maxPositions: 5,
      backtestMonths: 12,
    },
    badge: 'Populaire',
  },
  ultra: {
    name: 'Ultra',
    price: { monthly: 79, yearly: 635 },
    priceId: {
      monthly: 'price_1THWUq4Y1unNvKtXunzbVwY4',
      yearly: 'price_1THWUq4Y1unNvKtXpj2hGbd0',
    },
    features: [
      'Tout Pro inclus',
      'Trades illimites',
      'Exchanges illimites',
      '10 positions simultanees',
      'Backtest 60 mois',
      'Strategies personnalisees',
      'Acces API',
      'Support prioritaire',
    ],
    limits: {
      dailyQuestions: 999999,
      dailyTrades: 999999,
      maxExchanges: 999999,
      maxPositions: 10,
      backtestMonths: 60,
    },
  },
};

export function getPlanByPriceId(priceId: string): { plan: MidasPlan; period: BillingPeriod } | null {
  for (const [planKey, config] of Object.entries(PLANS)) {
    if (config.priceId.monthly === priceId) {
      return { plan: planKey as MidasPlan, period: 'monthly' };
    }
    if (config.priceId.yearly === priceId) {
      return { plan: planKey as MidasPlan, period: 'yearly' };
    }
  }
  return null;
}
