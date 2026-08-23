export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface GuideCard {
  title: string;
  description: string;
  iconName: 'BookOpen' | 'BarChart3' | 'Shield' | 'Wallet' | 'Zap';
  color: string;
  href: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Général',
    question: "Qu'est-ce que MIDAS ?",
    answer: "MIDAS est une plateforme de trading assistée par intelligence artificielle. Elle t'aide à analyser les marchés crypto, créer des bots de trading automatisés et prendre de meilleures décisions d'investissement. 6 agents IA analysent le marché 24/7 pour toi.",
  },
  {
    id: 'faq-2',
    category: 'Général',
    question: 'MIDAS est-il gratuit ?',
    answer: "MIDAS propose un plan gratuit avec 15 questions IA par jour et un aperçu du marché. Les plans payants (Pro à 29,99€/mois, Ultra à 79,99€/mois) débloquent le trading automatisé, le backtesting, les signaux avancés et l'accès API. -33% avec l'abonnement annuel.",
  },
  {
    id: 'faq-3',
    category: 'Sécurité',
    question: 'Mes fonds sont-ils en sécurité ?',
    answer: "MIDAS ne détient jamais tes fonds. Tes clés API d'exchange sont chiffrées en AES-256-GCM et nous ne demandons jamais la permission de retrait. Tes fonds restent sur ton exchange. Même si nos serveurs étaient compromis, personne ne pourrait retirer tes fonds.",
  },
  {
    id: 'faq-4',
    category: 'Trading',
    question: 'Comment créer un bot de trading ?',
    answer: "Va dans la section \"Mes Bots\" et clique sur \"Créer un Bot\". Choisis une paire (ex: BTC/USDT), une stratégie (Momentum, Grid, DCA...), définis tes paramètres de risque (Stop Loss, Take Profit, taille de position) et active-le. Le bot exécutera automatiquement les trades selon ta stratégie.",
  },
  {
    id: 'faq-5',
    category: 'Trading',
    question: 'Quelles stratégies sont disponibles ?',
    answer: "MIDAS propose 6 stratégies : Momentum (suivi de tendance), Grid Trading (range trading), Mean Reversion (retour à la moyenne), Breakout (cassure de niveaux), DCA Intelligent (investissement régulier optimisé par l'IA) et Scalping (trades rapides sur micro-mouvements).",
  },
  {
    id: 'faq-6',
    category: 'Sécurité',
    question: "Qu'est-ce que le MIDAS Shield ?",
    answer: "Le MIDAS Shield est un système de protection automatique à 7 niveaux. Il surveille tes pertes en temps réel et désactive automatiquement tes bots si la perte journalière dépasse ta limite configurée. Il inclut aussi le position sizing, trailing stop, circuit breaker, crash detection et limites personnalisées.",
  },
  {
    id: 'faq-7',
    category: 'Exchanges',
    question: 'Quels exchanges sont supportés ?',
    answer: "MIDAS supporte actuellement Binance, qui est le plus grand exchange mondial. D'autres exchanges (Kraken, Bybit, OKX) seront ajoutés prochainement. Connecte ton exchange via une clé API avec permissions Lecture + Trading Spot uniquement.",
  },
  {
    id: 'faq-8',
    category: 'Exchanges',
    question: 'Comment connecter mon exchange ?',
    answer: "Lors de ton premier accès, l'assistant d'onboarding te guide étape par étape. Tu peux aussi aller dans Réglages > Exchanges. Crée une clé API sur Binance avec permissions Lecture + Trading Spot, puis colle ta clé et ton secret dans MIDAS. Elles sont chiffrées automatiquement.",
  },
  {
    id: 'faq-9',
    category: 'Sécurité',
    question: 'Pourquoi ne pas activer la permission de retrait ?',
    answer: "Par sécurité absolue. MIDAS n'a besoin que de lire tes positions et d'exécuter des trades. La permission de retrait n'est jamais nécessaire et représente un risque. Même en cas de fuite de données, tes fonds sont protégés.",
  },
  {
    id: 'faq-10',
    category: 'Abonnement',
    question: 'Comment changer de plan ?',
    answer: "Va dans Réglages > Mon plan ou sur la page Tarifs. Sélectionne le plan souhaité. La différence sera calculée au prorata. Tu peux aussi passer au paiement annuel pour économiser 33%. Le changement prend effet immédiatement.",
  },
  {
    id: 'faq-11',
    category: 'Abonnement',
    question: "Comment parrainer quelqu'un ?",
    answer: "Partage ton code de parrainage (MIDAS-XXXXX) depuis la section Parrainage du dashboard. Ton filleul bénéficie de -50% sur son premier abonnement. Tu reçois 50% de son premier paiement + 10% de ses paiements récurrents à vie dans ton wallet.",
  },
  {
    id: 'faq-12',
    category: 'Abonnement',
    question: 'Comment retirer mes gains de parrainage ?',
    answer: "Va dans la section Wallet. Configure ton IBAN, puis demande un retrait (minimum 5€). Les virements sont traités sous 3-5 jours ouvrables après validation par l'équipe. Tu peux retirer jusqu'à 1000€ par transaction.",
  },
  {
    id: 'faq-13',
    category: 'Trading',
    question: 'Comment fonctionne le backtesting ?',
    answer: "Le backtesting te permet de tester une stratégie sur des données historiques AVANT de risquer de l'argent réel. Choisis une paire, une période et une stratégie. MIDAS simule tous les trades et te montre le résultat : profit, drawdown max, win rate, Sharpe ratio. Disponible avec le plan Pro.",
  },
  {
    id: 'faq-14',
    category: 'Abonnement',
    question: 'Comment annuler mon abonnement ?',
    answer: "Va dans Réglages > Mon plan, ou clique sur \"Gérer mon abonnement\" dans le menu utilisateur. Tu peux annuler à tout moment. L'accès est maintenu jusqu'à la fin de la période payée. Tu ne seras plus débité au renouvellement.",
  },
  {
    id: 'faq-15',
    category: 'Général',
    question: "MIDAS est-il enregistré auprès de l'AMF ?",
    answer: "MIDAS est un logiciel d'aide à la décision, pas un service de conseil en investissement. PURAMA n'est pas enregistrée en tant que PSAN ou CIF. MIDAS ne détient jamais vos fonds et ne fournit aucun conseil financier personnalisé. Vous êtes seul responsable de vos décisions de trading.",
  },
  {
    id: 'faq-16',
    category: 'Trading',
    question: "Qu'est-ce que le paper trading ?",
    answer: "Le paper trading est un mode simulation qui te permet de trader avec de l'argent virtuel (50 000€ par défaut). C'est activé automatiquement pendant tes 7 premiers jours. Tu peux tester les stratégies sans risque avant de passer en réel.",
  },
  {
    id: 'faq-17',
    category: 'Sécurité',
    question: 'Comment sont stockées mes clés API ?',
    answer: "Tes clés API sont chiffrées côté serveur avec l'algorithme AES-256-GCM avant d'être stockées en base de données. Le chiffrement utilise un vecteur d'initialisation unique par clé et un tag d'authentification pour détecter toute altération. Personne, même notre équipe, ne peut les lire en clair.",
  },
  {
    id: 'faq-18',
    category: 'Exchanges',
    question: 'Que faire si ma clé API ne fonctionne plus ?',
    answer: "Si ta clé API expire ou est révoquée, va dans Réglages > Exchanges et entre une nouvelle clé. Vérifie que les permissions Lecture + Trading Spot sont bien activées sur Binance. MIDAS teste automatiquement la connexion pour te confirmer que tout fonctionne.",
  },
];

export const GUIDE_CARDS: GuideCard[] = [
  {
    title: 'Débuter avec MIDAS',
    description: 'Apprends les bases : connexion exchange, premier bot, lecture des signaux.',
    iconName: 'BookOpen',
    color: 'text-[#FFD700]',
    href: '/dashboard/help/connect-binance',
  },
  {
    title: 'Stratégies de trading',
    description: 'Comprends chaque stratégie et choisis celle adaptée à ton profil.',
    iconName: 'BarChart3',
    color: 'text-emerald-400',
    href: '/dashboard/help/strategies',
  },
  {
    title: 'Sécurité & MIDAS Shield',
    description: 'Découvre comment MIDAS protège ton capital automatiquement.',
    iconName: 'Shield',
    color: 'text-cyan-400',
    href: '/dashboard/help/shield',
  },
  {
    title: 'Parrainage & Wallet',
    description: "Gagne de l'argent en parrainant et gère tes retraits facilement.",
    iconName: 'Wallet',
    color: 'text-orange-400',
    href: '/dashboard/help/referral-wallet',
  },
  {
    title: 'Guide complet MIDAS',
    description: 'Tout comprendre de A à Z : signaux, stratégies, Shield, parrainage et plus.',
    iconName: 'Zap',
    color: 'text-purple-400',
    href: '/dashboard/guide',
  },
];

export const CATEGORIES = ['Tous', 'Général', 'Trading', 'Exchanges', 'Abonnement', 'Sécurité'];
