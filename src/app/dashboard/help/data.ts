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
    answer: "MIDAS est un espace d'information et d'éducation sur les marchés crypto. Ses analyses restent générales, ne constituent pas un conseil en investissement et ne déclenchent aucun ordre réel.",
  },
  {
    id: 'faq-2',
    category: 'Général',
    question: 'MIDAS est-il gratuit ?',
    answer: "MIDAS est accessible selon les droits de l'abonnement unique PURAMA. Les quotas et tarifs sont gérés par EKA ; aucun abonnement MIDAS distinct ni trading automatisé réel n'est proposé.",
  },
  {
    id: 'faq-3',
    category: 'Sécurité',
    question: 'Mes fonds sont-ils en sécurité ?',
    answer: "MIDAS ne détient jamais tes fonds, ne demande aucune clé d'exchange et n'exécute aucun ordre. Les simulations utilisent uniquement des données fictives ou générales.",
  },
  {
    id: 'faq-4',
    category: 'Trading',
    question: 'Comment créer un bot de trading ?',
    answer: "Les scénarios de bot sont des simulations éducatives avec fonds fictifs. Ils servent à comprendre le fonctionnement d'une stratégie et ne transmettent aucun ordre à un exchange.",
  },
  {
    id: 'faq-5',
    category: 'Trading',
    question: 'Quelles stratégies sont disponibles ?',
    answer: "MIDAS présente des mécanismes de marché à titre pédagogique. Aucun scénario n'est recommandé selon ta situation et aucun résultat futur n'est prédit.",
  },
  {
    id: 'faq-6',
    category: 'Sécurité',
    question: "Qu'est-ce que le MIDAS Shield ?",
    answer: "MIDAS Shield regroupe des explications générales sur les risques. Il ne surveille aucun portefeuille réel et ne remplace pas un professionnel habilité.",
  },
  {
    id: 'faq-7',
    category: 'Exchanges',
    question: 'Quels exchanges sont supportés ?',
    answer: "La connexion et la promotion d'exchanges sont désactivées en France. MIDAS utilise uniquement des données de marché à des fins générales et éducatives.",
  },
  {
    id: 'faq-8',
    category: 'Exchanges',
    question: 'Comment connecter mon exchange ?',
    answer: "Aucune clé d'exchange n'est demandée : la connexion d'exchange est désactivée. Ne communique jamais tes clés API ou secrets dans le chat.",
  },
  {
    id: 'faq-9',
    category: 'Sécurité',
    question: 'Pourquoi ne pas activer la permission de retrait ?',
    answer: "MIDAS ne demande aucune permission d'exchange, y compris lecture, trading ou retrait. Ne partage jamais une clé API ou un secret.",
  },
  {
    id: 'faq-10',
    category: 'Abonnement',
    question: 'Comment changer de plan ?',
    answer: "Les droits MIDAS dépendent de l'abonnement unique PURAMA, géré sur le site PURAMA. L'application mobile ne contient aucun achat ni lien d'achat.",
  },
  {
    id: 'faq-11',
    category: 'Abonnement',
    question: "Comment parrainer quelqu'un ?",
    answer: "Le parrainage suit uniquement les règles centrales PURAMA. MIDAS ne promet aucun pourcentage local et n'applique aucun prélèvement sur les gains des utilisateurs.",
  },
  {
    id: 'faq-12',
    category: 'Abonnement',
    question: 'Comment retirer mes gains de parrainage ?',
    answer: "La Phase 1 fonctionne uniquement en points. Aucun retrait monétaire ni IBAN n'est disponible tant qu'un montage Swan écrit et validé n'existe pas.",
  },
  {
    id: 'faq-13',
    category: 'Trading',
    question: 'Comment fonctionne le backtesting ?',
    answer: "Le backtesting est une simulation pédagogique sur des données historiques. Ses résultats ne constituent ni une recommandation ni une indication de performance future.",
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
    answer: "MIDAS fournit uniquement de l'information générale et de l'éducation. Il ne fournit aucun conseil financier personnalisé, ne promeut aucun service crypto en France et n'exécute aucune opération.",
  },
  {
    id: 'faq-16',
    category: 'Trading',
    question: "Qu'est-ce que le paper trading ?",
    answer: "Le paper trading est une simulation pédagogique avec des unités fictives. Il ne prépare ni ne bascule vers une exécution réelle.",
  },
  {
    id: 'faq-17',
    category: 'Sécurité',
    question: 'Comment sont stockées mes clés API ?',
    answer: "MIDAS ne collecte et ne stocke aucune clé API d'exchange. Ne saisis jamais de secret d'accès dans l'application ou le chat.",
  },
  {
    id: 'faq-18',
    category: 'Exchanges',
    question: 'Que faire si ma clé API ne fonctionne plus ?',
    answer: "Aucune clé API n'est utilisée. Une page qui demanderait une clé ou proposerait une connexion d'exchange doit être considérée comme indisponible.",
  },
];

export const GUIDE_CARDS: GuideCard[] = [
  // Les pages de guide détaillées sont neutralisées (D2=A) : les cartes
  // renvoient à la FAQ de cette même page via l'ancre #faq, pas à des
  // redirections mortes.
  {
    title: 'Débuter avec MIDAS',
    description: 'Apprends les bases des marchés et les limites des simulations.',
    iconName: 'BookOpen',
    color: 'text-[#FFD700]',
    href: '#faq',
  },
  {
    title: 'Stratégies de trading',
    description: 'Comprends les mécanismes sans recommandation personnalisée.',
    iconName: 'BarChart3',
    color: 'text-emerald-400',
    href: '#faq',
  },
  {
    title: 'Sécurité & MIDAS Shield',
    description: 'Découvre les principaux risques et réflexes de prudence.',
    iconName: 'Shield',
    color: 'text-cyan-400',
    href: '#faq',
  },
  {
    title: 'Points PURAMA',
    description: "Comprends la Phase 1 en points, sans retrait monétaire.",
    iconName: 'Wallet',
    color: 'text-orange-400',
    href: '#faq',
  },
  {
    title: 'Guide complet MIDAS',
    description: 'Tout comprendre de A à Z dans un cadre strictement éducatif.',
    iconName: 'Zap',
    color: 'text-purple-400',
    href: '#faq',
  },
];

export const CATEGORIES = ['Tous', 'Général', 'Trading', 'Exchanges', 'Abonnement', 'Sécurité'];
