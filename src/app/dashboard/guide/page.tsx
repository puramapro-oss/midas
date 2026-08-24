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
import { GUIDE_SECTIONS } from './data';

const ICON_MAP = {
  Sparkles,
  Signal,
  CandlestickChart,
  Shield,
  Gift,
  Wallet,
  HelpCircle,
  Activity,
  Target,
  TrendingUp,
};

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
        const Icon = ICON_MAP[section.iconName];

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
        MIDAS est un outil d&apos;aide à la décision, pas un conseil en investissement.
      </motion.div>
    </motion.div>
  );
}
