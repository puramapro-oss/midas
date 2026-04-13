'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Signal,
  CandlestickChart,
  Shield,
  Gift,
  Wallet,
  HelpCircle,
  Play,
  ChevronDown,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

interface GuideSection {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  content: {
    heading: string;
    text: string;
    icon?: React.ElementType;
  }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'how-it-works',
    icon: Sparkles,
    title: 'Comment fonctionne MIDAS',
    subtitle: '6 agents IA analysent le marché pour toi',
    color: 'var(--gold-primary)',
    content: [
      {
        heading: 'Intelligence artificielle 24/7',
        text: 'MIDAS utilise 6 agents IA spécialisés qui analysent en permanence les marchés crypto. Chaque agent a son domaine : analyse technique, sentiment du marché, données on-chain, flux de liquidités, corrélations macro et détection de patterns.',
        icon: Activity,
      },
      {
        heading: 'Scores en temps réel',
        text: 'Sur ton dashboard, tu vois 4 scores principaux : Global (la moyenne pondérée), Technique (RSI, MACD, moyennes mobiles...), Sentiment (réseaux sociaux, news, fear & greed) et On-Chain (mouvements de whales, flux exchanges, métriques réseau).',
        icon: Target,
      },
      {
        heading: 'Décisions automatiques ou manuelles',
        text: 'Tu peux activer le trading automatique et laisser MIDAS gérer tes positions, ou suivre les signaux manuellement. C\'est toi qui décides du niveau d\'autonomie.',
        icon: TrendingUp,
      },
    ],
  },
  {
    id: 'signals',
    icon: Signal,
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
    icon: CandlestickChart,
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
    icon: Shield,
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
    icon: Gift,
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
    icon: Wallet,
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
    icon: HelpCircle,
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

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 } as const,
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
};

export default function GuidePage() {
  const { user } = useAuth();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['how-it-works']));
  const [relaunchLoading, setRelaunchLoading] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const relaunchTutorial = useCallback(async () => {
    if (!user) return;
    setRelaunchLoading(true);
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ tutorial_completed: false })
      .eq('id', user.id);
    // Redirect to dashboard — tutorial will trigger
    window.location.href = '/dashboard';
  }, [user]);

  return (
    <motion.div
      className="max-w-3xl mx-auto space-y-6"
      variants={stagger}
      initial="hidden"
      animate="visible"
      data-testid="guide-page"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="text-center space-y-3 pb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
          Guide <span className="gradient-text-gold">MIDAS</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-lg mx-auto">
          Tout ce que tu dois savoir pour utiliser MIDAS comme un pro.
          De tes premiers pas aux stratégies avancées.
        </p>
      </motion.div>

      {/* Relaunch tutorial button */}
      <motion.div variants={fadeUp} className="flex justify-center">
        <button
          onClick={relaunchTutorial}
          disabled={relaunchLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gold-primary)] text-black text-sm font-semibold hover:bg-[var(--gold-secondary)] transition-colors disabled:opacity-50"
          data-testid="guide-relaunch-tutorial"
        >
          <Play className="w-4 h-4" />
          {relaunchLoading ? 'Redirection...' : 'Relancer le tuto interactif'}
        </button>
      </motion.div>

      {/* Sections */}
      {GUIDE_SECTIONS.map((section) => {
        const isOpen = openSections.has(section.id);
        const Icon = section.icon;

        return (
          <motion.div
            key={section.id}
            variants={fadeUp}
            className="glass rounded-2xl border border-white/[0.06] overflow-hidden"
            data-testid={`guide-section-${section.id}`}
          >
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
              data-testid={`guide-toggle-${section.id}`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${section.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: section.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  {section.title}
                </h2>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  {section.subtitle}
                </p>
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-[var(--text-tertiary)]" />
              </motion.div>
            </button>

            {/* Section content */}
            <motion.div
              initial={false}
              animate={{
                height: isOpen ? 'auto' : 0,
                opacity: isOpen ? 1 : 0,
              }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4">
                {section.content.map((item, i) => {
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[var(--text-tertiary)]">
                          {i + 1}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                          {item.heading}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        );
      })}

      {/* Disclaimer */}
      <motion.div
        variants={fadeUp}
        className="text-center py-4 text-xs text-[var(--text-tertiary)]"
      >
        Le trading de crypto-monnaies comporte des risques significatifs de perte en capital.
        MIDAS est un outil d'aide à la décision, pas un conseil en investissement.
      </motion.div>
    </motion.div>
  );
}
