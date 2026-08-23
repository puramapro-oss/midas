'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  HelpCircle,
  ExternalLink,
  Mail,
  ChevronDown,
  Zap,
  BookOpen,
  BarChart3,
  Shield,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import { FAQ_ITEMS, GUIDE_CARDS, CATEGORIES } from './data';
import type { FAQItem } from './data';

const ICON_MAP = {
  BookOpen,
  BarChart3,
  Shield,
  Wallet,
  Zap,
};

const FAQItemComponent = ({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <motion.div
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
      onClick={onToggle}
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
          {GUIDE_CARDS.map((guide, index) => {
            const Icon = ICON_MAP[guide.iconName];
            return (
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
                <div className={cn('mb-3 opacity-60', guide.color)}>
                  <Icon className="h-5 w-5" />
                </div>
              <h3 className="text-sm font-semibold text-white mb-1">{guide.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{guide.description}</p>
                <div className="flex items-center gap-1 mt-3 text-[10px] text-[#FFD700]/60 group-hover:text-[#FFD700] transition-colors">
                  <span>Lire le guide</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </motion.a>
            );
          })}
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
          {filteredFaqs.map((faq, index) => (
            <FAQItemComponent
              key={faq.id}
              faq={faq}
              index={index}
              isOpen={openFaq.has(faq.id)}
              onToggle={() => toggleFaq(faq.id)}
            />
          ))}

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
