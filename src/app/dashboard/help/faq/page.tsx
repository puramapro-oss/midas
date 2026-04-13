'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  HelpCircle,
  ChevronDown,
  ThumbsUp,
  Eye,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';

interface FAQArticle {
  id: string;
  category: string;
  question: string;
  answer: string;
  search_keywords: string[] | null;
  view_count: number;
  helpful_count: number;
}

const CATEGORIES = [
  'Tous',
  'Général',
  'Trading',
  'Wallet',
  'Parrainage',
  'Points',
  'Sécurité',
];

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const words = q.split(/\s+/);
  return words.every((word) => lower.includes(word));
}

export default function FAQPage() {
  const [articles, setArticles] = useState<FAQArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/faq');
      if (!res.ok) return;
      const data = await res.json();
      setArticles(data.articles ?? []);
    } catch {
      // silent fail — show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Increment view count on first open
        fetch('/api/faq', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, field: 'view' }),
        }).catch(() => {});
      }
      return next;
    });
  };

  const handleHelpful = async (id: string) => {
    if (helpfulIds.has(id)) return;
    setHelpfulIds((prev) => new Set(prev).add(id));

    // Optimistic update
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, helpful_count: a.helpful_count + 1 } : a))
    );

    try {
      await fetch('/api/faq', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field: 'helpful' }),
      });
    } catch {
      // Rollback
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, helpful_count: a.helpful_count - 1 } : a))
      );
      setHelpfulIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const filtered = articles.filter((article) => {
    const matchCategory =
      activeCategory === 'Tous' || article.category === activeCategory;
    if (!matchCategory) return false;

    if (!search.trim()) return true;

    const keywordsText = (article.search_keywords ?? []).join(' ');
    return (
      fuzzyMatch(article.question, search) ||
      fuzzyMatch(keywordsText, search) ||
      fuzzyMatch(article.answer, search)
    );
  });

  return (
    <div className="space-y-6" data-testid="faq-page">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          FAQ
        </h1>
        <p className="text-sm text-white/40 mt-2">
          Retrouve les réponses aux questions les plus fréquentes.
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
            data-testid="faq-search"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200',
              activeCategory === cat
                ? 'bg-[#FFD700] text-[#0A0A0F] shadow-[0_0_12px_rgba(255,215,0,0.2)]'
                : 'bg-white/[0.04] text-white/40 hover:text-white/60 border border-white/[0.06]'
            )}
            data-testid={`faq-tab-${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="h-6 w-6 text-[#FFD700]/40 mx-auto animate-spin" />
          <p className="text-xs text-white/30 mt-3">Chargement des articles...</p>
        </div>
      )}

      {/* FAQ list */}
      {!loading && (
        <div className="space-y-2" data-testid="faq-article-list">
          <AnimatePresence mode="popLayout">
            {filtered.map((article, index) => {
              const isOpen = openIds.has(article.id);
              const isHelpful = helpfulIds.has(article.id);
              return (
                <motion.div
                  key={article.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    'rounded-xl border transition-colors duration-200',
                    isOpen
                      ? 'border-[#FFD700]/20 bg-[#FFD700]/[0.02]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                  )}
                  data-testid={`faq-article-${article.id}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleOpen(article.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="flex-1 pr-4">
                      <span
                        className={cn(
                          'text-sm font-medium transition-colors block',
                          isOpen ? 'text-white' : 'text-white/70'
                        )}
                      >
                        {article.question}
                      </span>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/30">
                          {article.category}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-white/20">
                          <Eye className="h-3 w-3" />
                          {article.view_count}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-white/20">
                          <ThumbsUp className="h-3 w-3" />
                          {article.helpful_count}
                        </span>
                      </div>
                    </div>
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

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4">
                          <p className="text-sm text-white/50 leading-relaxed">
                            {article.answer}
                          </p>
                          <div className="mt-4 flex items-center gap-3">
                            <span className="text-xs text-white/30">Utile ?</span>
                            <button
                              type="button"
                              onClick={() => handleHelpful(article.id)}
                              disabled={isHelpful}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                                isHelpful
                                  ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 cursor-default'
                                  : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-[#FFD700] hover:border-[#FFD700]/20'
                              )}
                            >
                              <ThumbsUp className="h-3 w-3" />
                              {isHelpful ? 'Merci !' : 'Oui'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && !loading && (
            <div className="py-12 text-center">
              <HelpCircle className="h-8 w-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">Aucun résultat pour cette recherche.</p>
              <p className="text-xs text-white/20 mt-1">Essaie avec d&apos;autres mots-clés.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
