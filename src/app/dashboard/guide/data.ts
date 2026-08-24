export interface GuideSectionContent {
  heading: string;
  text: string;
  iconName?: 'Activity' | 'Target' | 'TrendingUp';
}

export interface GuideSection {
  id: string;
  iconName: 'Sparkles' | 'Signal' | 'CandlestickChart' | 'Shield' | 'Gift' | 'Wallet' | 'HelpCircle';
  title: string;
  subtitle: string;
  color: string;
  content: GuideSectionContent[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'how-it-works',
    iconName: 'Sparkles',
    title: 'Comment fonctionne MIDAS',
    subtitle: '6 agents IA analysent le marché pour toi',
    color: 'var(--gold-primary)',
    content: [
      {
        heading: 'Intelligence artificielle 24/7',
        text: 'MIDAS utilise 6 agents IA spécialisés qui analysent en permanence les marchés crypto. Chaque agent a son domaine : analyse technique, sentiment du marché, données on-chain, flux de liquidités, corrélations macro et détection de patterns.',
        iconName: 'Activity',
      },
      {
        heading: 'Scores en temps réel',
        text: 'Sur ton dashboard, tu vois 4 scores principaux : Global (la moyenne pondérée), Technique (RSI, MACD, moyennes mobiles...), Sentiment (réseaux sociaux, news, fear & greed) et On-Chain (mouvements de whales, flux exchanges, métriques réseau).',
        iconName: 'Target',
      },
      {
        heading: 'Décisions automatiques ou manuelles',
        text: 'Tu peux activer le trading automatique et laisser MIDAS gérer tes positions, ou suivre les signaux manuellement. C\'est toi qui décides du niveau d\'autonomie.',
        iconName: 'TrendingUp',
      },
    ],
  },
  {
    id: 'signals',
    iconName: 'Signal',
    title: 'Comprendre les signaux',
    subtitle: 'BUY, SELL, confiance et niveaux clés',
    color: '#10B981',
    content: [
      {
        heading: 'Type de signal',
        text: 'Chaque signal est soit BUY (achat) soit SELL (vente). Il est généré quand plusieurs agents IA convergent vers la même direction. Plus les agents sont d\'accord, plus le signal est fort.',
      },
      {
        heading: 'Niveau de confiance',
        text: 'Exprimé en pourcentage (ex: 87%). Au-dessus de 75%, le signal est considéré comme fort. En dessous de 50%, c\'est une simple indication. Ne trade jamais un signal faible sans ta propre analyse.',
      },
      {
        heading: 'Stop-Loss et Take-Profit',
        text: 'Chaque signal inclut un SL (prix auquel couper les pertes) et un TP (prix objectif). Le ratio Risk:Reward (R:R) te dit si le trade vaut le coup. Un R:R de 1:3 signifie que tu risques 1 pour gagner 3.',
      },
    ],
  },
  {
    id: 'trading',
    iconName: 'CandlestickChart',
    title: 'Les stratégies de trading',
    subtitle: '6 stratégies adaptées à ton profil',
    color: '#3B82F6',
    content: [
      {
        heading: 'Momentum',
        text: 'Suit la tendance. Quand le marché monte fort, on achète. Quand il descend fort, on vend. Simple et efficace en marché directionnel.',
      },
      {
        heading: 'Grid Trading',
        text: 'Place des ordres d\'achat et de vente à intervalles réguliers. Parfait en marché latéral (range). Génère des petits profits réguliers.',
      },
      {
        heading: 'DCA (Dollar Cost Average)',
        text: 'Investit un montant fixe à intervalle régulier, quel que soit le prix. Réduit l\'impact de la volatilité. La stratégie la plus sûre pour les débutants.',
      },
      {
        heading: 'Mean Reversion',
        text: 'Achète quand le prix est anormalement bas, vend quand il est anormalement haut. Basé sur des indicateurs statistiques comme les Bollinger Bands.',
      },
      {
        heading: 'Breakout',
        text: 'Détecte quand le prix casse un niveau important (support/résistance). Les breakouts sont souvent suivis de mouvements rapides et importants.',
      },
      {
        heading: 'Scalping',
        text: 'Trades très courts (quelques minutes). Beaucoup de trades avec de petits gains. Réservé aux profils agressifs. MIDAS gère le timing automatiquement.',
      },
    ],
  },
  {
    id: 'shield',
    iconName: 'Shield',
    title: 'Le MIDAS Shield',
    subtitle: '7 niveaux de protection pour ton capital',
    color: '#8B5CF6',
    content: [
      {
        heading: 'Niveau 1 — Stop-Loss automatique',
        text: 'Chaque position a un stop-loss. Si le prix va contre toi, la position est coupée automatiquement pour limiter les pertes.',
      },
      {
        heading: 'Niveau 2 — Limite de pertes journalière',
        text: 'Si tes pertes du jour dépassent ton seuil (que tu choisis), MIDAS arrête de trader pour la journée. Tu ne peux pas tout perdre en un jour.',
      },
      {
        heading: 'Niveau 3 — Limite hebdomadaire',
        text: 'Même principe sur la semaine. Si la semaine est mauvaise, on se met en pause pour éviter le tilt.',
      },
      {
        heading: 'Niveau 4 — Détection d\'anomalies',
        text: 'L\'IA détecte les mouvements anormaux du marché (flash crash, manipulation) et suspend le trading le temps que ça se calme.',
      },
      {
        heading: 'Niveau 5 — Anti-liquidation',
        text: 'Surveille tes positions en levier et réduit automatiquement l\'exposition si le risque de liquidation augmente.',
      },
      {
        heading: 'Niveau 6 — Diversification forcée',
        text: 'Empêche de mettre tout ton capital sur un seul trade. Limite l\'exposition par paire et par direction.',
      },
      {
        heading: 'Niveau 7 — Circuit Breaker',
        text: 'En cas de crash majeur du marché, MIDAS ferme toutes les positions et passe en mode protection totale. Ton capital est prioritaire.',
      },
    ],
  },
  {
    id: 'referral',
    iconName: 'Gift',
    title: 'Gagner avec le parrainage',
    subtitle: 'Commissions à vie sur tes filleuls',
    color: '#EC4899',
    content: [
      {
        heading: 'Ton filleul gagne aussi',
        text: 'Quand quelqu\'un s\'inscrit avec ton lien, il obtient -50% sur son premier mois d\'abonnement. C\'est un vrai avantage pour lui.',
      },
      {
        heading: 'Tes commissions',
        text: '50% du premier paiement de ton filleul + 10% de tous ses paiements suivants, à vie. Tu touches aussi -10% sur ton propre abonnement par filleul actif.',
      },
      {
        heading: 'Paliers bonus',
        text: 'Tous les 10 filleuls actifs, tu débloques +30% de bonus sur tes commissions du mois. Plus tu parraines, plus c\'est rentable.',
      },
      {
        heading: 'Anti-fraude',
        text: 'Auto-parrainage, emails jetables, mêmes IP/cartes = bloqué. Désabonnement avant 48h = commission annulée. On récompense le vrai parrainage.',
      },
    ],
  },
  {
    id: 'wallet',
    iconName: 'Wallet',
    title: 'Gérer ton wallet',
    subtitle: 'Retire tes gains facilement',
    color: '#F59E0B',
    content: [
      {
        heading: 'Comment ça marche',
        text: 'Tes commissions de parrainage et récompenses de concours sont créditées dans ton wallet MIDAS. Tu vois le solde en temps réel dans ton dashboard.',
      },
      {
        heading: 'Retrait',
        text: 'Minimum 5€ pour un retrait. Tu renseignes ton IBAN (masqué pour la sécurité) et tu demandes un virement. Maximum 1 retrait par jour, jusqu\'à 1000€.',
      },
      {
        heading: 'Délai de traitement',
        text: 'Les retraits sont traités manuellement pour garantir la sécurité. Compte 1 à 3 jours ouvrés. Tu reçois un email de confirmation.',
      },
    ],
  },
  {
    id: 'faq',
    iconName: 'HelpCircle',
    title: 'FAQ rapide',
    subtitle: 'Les questions les plus fréquentes',
    color: '#6366F1',
    content: [
      {
        heading: 'Est-ce que MIDAS trade avec mon argent ?',
        text: 'Non. MIDAS se connecte à ton compte Binance via des clés API en lecture + trading. Ton argent reste sur Binance. MIDAS ne peut pas retirer de fonds.',
      },
      {
        heading: 'Je suis débutant, c\'est pour moi ?',
        text: 'Oui. Choisis le profil de risque "Prudent", active le trading automatique et laisse MIDAS gérer. Les signaux et le Shield sont là pour te protéger.',
      },
      {
        heading: 'Combien je peux espérer gagner ?',
        text: 'Ça dépend du marché, de ton capital et de ton profil de risque. MIDAS ne garantit aucun rendement. Le trading comporte des risques de perte en capital.',
      },
      {
        heading: 'Comment annuler mon abonnement ?',
        text: 'Va dans Paramètres > Mon plan > Gérer l\'abonnement. Tu peux annuler à tout moment. Tu gardes l\'accès jusqu\'à la fin de ta période payée.',
      },
      {
        heading: 'Mes clés API sont-elles en sécurité ?',
        text: 'Oui. Tes clés sont chiffrées avant stockage et ne sont jamais affichées en clair. Elles sont configurées sans permission de retrait sur Binance.',
      },
    ],
  },
];
