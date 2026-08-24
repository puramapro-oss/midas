import { Zap, Sparkles, Crown } from 'lucide-react'

/**
 * Pricing — Configuration des plans
 * Extrait de Pricing.tsx pour réduire sa taille
 */

export interface PlanFeature {
  text: string
  included: boolean
}

export interface Plan {
  name: string
  slug: 'free' | 'pro' | 'ultra'
  icon: React.ReactNode
  monthlyPrice: number
  yearlyPrice: number
  yearlyMonthly: number
  description: string
  features: PlanFeature[]
  cta: string
  popular?: boolean
}

export const plans: Plan[] = [
  {
    name: 'Free',
    slug: 'free',
    icon: <Zap className="h-5 w-5" />,
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyMonthly: 0,
    description: 'Decouvrez le trading assiste par IA sans engagement.',
    cta: 'Commencer gratuitement',
    features: [
      { text: '5 questions / jour', included: true },
      { text: 'Paper trading', included: true },
      { text: '1 exchange connecte', included: true },
      { text: 'Mode Simple', included: true },
      { text: 'Trades automatiques', included: false },
      { text: 'Backtesting', included: false },
      { text: 'MIDAS SHIELD complet', included: false },
      { text: 'Whale tracking', included: false },
      { text: 'Sentiment analysis', included: false },
      { text: 'Support prioritaire', included: false },
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    icon: <Sparkles className="h-5 w-5" />,
    monthlyPrice: 39,
    yearlyPrice: 313,
    yearlyMonthly: 26,
    description: 'Pour les traders serieux qui veulent un avantage reel.',
    cta: 'Passer a Pro',
    popular: true,
    features: [
      { text: 'Chat illimite avec MIDAS', included: true },
      { text: '2 trades automatiques / jour', included: true },
      { text: '2 exchanges connectes', included: true },
      { text: 'Mode Simple + Expert', included: true },
      { text: 'Backtesting complet', included: true },
      { text: 'MIDAS SHIELD complet', included: true },
      { text: 'Analyses en temps reel', included: true },
      { text: 'Whale tracking', included: false },
      { text: 'Sentiment analysis', included: false },
      { text: 'Support prioritaire', included: false },
    ],
  },
  {
    name: 'Ultra',
    slug: 'ultra',
    icon: <Crown className="h-5 w-5" />,
    monthlyPrice: 79,
    yearlyPrice: 635,
    yearlyMonthly: 53,
    description: 'La puissance maximale pour les traders professionnels.',
    cta: 'Devenir Ultra',
    features: [
      { text: 'Tout le plan Pro inclus', included: true },
      { text: 'Trades illimites', included: true },
      { text: 'Exchanges illimites', included: true },
      { text: 'Strategies exclusives', included: true },
      { text: 'Whale tracking', included: true },
      { text: 'Sentiment analysis', included: true },
      { text: 'Support prioritaire 24/7', included: true },
      { text: 'Backtesting avance', included: true },
      { text: 'Acces beta en avant-premiere', included: true },
      { text: 'Sessions coaching mensuelles', included: true },
    ],
  },
]
