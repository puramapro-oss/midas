'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  BookOpen,
  Shield,
  HelpCircle,
  ExternalLink,
  Mail,
  ChevronDown,
  Zap,
  BarChart3,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface GuideCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
}

const FAQ_ITEMS: FAQItem[] = [
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

const GUIDE_CARDS: GuideCard[] = [
  {
    title: 'Débuter avec MIDAS',
    description: 'Apprends les bases : connexion exchange, premier bot, lecture des signaux.',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'text-[#FFD700]',
    href: '/dashboard/help/connect-binance',
  },
  {
    title: 'Stratégies de trading',
    description: 'Comprends chaque stratégie et choisis celle adaptée à ton profil.',
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'text-emerald-400',
    href: '/dashboard/help/strategies',
  },
  {
    title: 'Sécurité & MIDAS Shield',
    description: 'Découvre comment MIDAS protège ton capital automatiquement.',
    icon: <Shield className="h-5 w-5" />,
    color: 'text-cyan-400',
    href: '/dashboard/help/shield',
  },
  {
    title: 'Parrainage & Wallet',
    description: "Gagne de l'argent en parrainant et gère tes retraits facilement.",
    icon: <Wallet className="h-5 w-5" />,
    color: 'text-orange-400',
    href: '/dashboard/help/referral-wallet',
  },
  {
    title: 'Guide complet MIDAS',
    description: 'Tout comprendre de A à Z : signaux, stratégies, Shield, parrainage et plus.',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-purple-400',
    href: '/dashboard/guide',
  },
];

const CATEGORIES = ['Tous', 'Général', 'Trading', 'Exchanges', 'Abonnement', 'Sécurité'];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [openFaq, setOpenFaq] = useState<Set<string>>(new Set());

  const toggleFaq = (id: string) => {
    setOpenFaq((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredFaqs = FAQ_ITEMS.filter((faq) => {
    const matchesSearch =
      !search ||
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8" data-testid="help-page">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          Centre d&apos;aide
        </h1>
        <p className="text-sm text-white/40 mt-2">
          Trouve des réponses à tes questions ou contacte notre équipe.
        </p>

        {/* Search */}
        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher une question..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)]"
            data-testid="help-search"
          />
        </div>
      </div>

      {/* Guides */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#FFD700]/40" />
          Guides rapides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GUIDE_CARDS.map((guide, index) => (
            <motion.a
              key={guide.title}
              href={guide.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -2 }}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 hover:border-[#FFD700]/20 hover:shadow-[0_0_30px_rgba(255,215,0,0.05)] transition-all duration-300"
              data-testid={`guide-card-${index}`}
            >
              <div className={cn('mb-3 opacity-60', guide.color)}>{guide.icon}</div>
              <h3 className="text-sm font-semibold text-white mb-1">{guide.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{guide.description}</p>
              <div className="flex items-center gap-1 mt-3 text-[10px] text-[#FFD700]/60 group-hover:text-[#FFD700] transition-colors">
                <span>Lire le guide</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 mb-4 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-[#FFD700]/40" />
          Questions fréquentes
        </h2>

        {/* Category tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200',
                activeCategory === cat
                  ? 'bg-[#FFD700] text-[#0A0A0F] shadow-[0_0_12px_rgba(255,215,0,0.2)]'
                  : 'bg-white/[0.04] text-white/40 hover:text-white/60 border border-white/[0.06]'
              )}
              data-testid={`faq-category-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-2" data-testid="faq-list">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openFaq.has(faq.id);
            return (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'rounded-xl border transition-colors duration-200',
                  isOpen
                    ? 'border-[#FFD700]/20 bg-[#FFD700]/[0.02]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                )}
                data-testid={`faq-${faq.id}`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors pr-4',
                      isOpen ? 'text-white' : 'text-white/70'
                    )}
                  >
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isOpen ? 'text-[#FFD700]' : 'text-white/30'
                      )}
                    />
                  </motion.div>
                </button>

                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 text-sm text-white/50 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          {filteredFaqs.length === 0 && (
            <div className="py-12 text-center">
              <HelpCircle className="h-8 w-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">Aucun résultat pour cette recherche.</p>
            </div>
          )}
        </div>
      </div>

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 text-center"
        data-testid="help-contact"
      >
        <Mail className="h-6 w-6 text-[#FFD700]/40 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white">Besoin d&apos;aide supplémentaire ?</h3>
        <p className="text-xs text-white/40 mt-1 mb-4">
          Notre équipe répond généralement sous 24h.
        </p>
        <a
          href="mailto:support@purama.dev"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#FFD700]/30 text-[#FFD700] text-sm font-medium hover:bg-[#FFD700]/10 transition-all"
          data-testid="contact-email"
        >
          <Mail className="h-4 w-4" />
          support@purama.dev
        </a>
      </motion.div>
    </div>
  );
}
