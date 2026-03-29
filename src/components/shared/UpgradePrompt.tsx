'use client';

import { Zap, TrendingUp, Bot, BarChart3, Shield } from 'lucide-react';
import Link from 'next/link';

interface UpgradePromptProps {
  requiredPlan: 'starter' | 'pro' | 'ultra';
  featureName?: string;
}

const planFeatures: Record<string, { label: string; price: string; features: { icon: typeof Zap; text: string }[] }> = {
  starter: {
    label: 'Starter',
    price: '9,99€',
    features: [
      { icon: TrendingUp, text: '100 questions/jour' },
      { icon: BarChart3, text: 'Alertes de prix' },
      { icon: Shield, text: 'Portefeuille basique' },
    ],
  },
  pro: {
    label: 'Pro',
    price: '29,99€',
    features: [
      { icon: TrendingUp, text: '500 questions/jour' },
      { icon: Bot, text: 'Backtesting & signaux' },
      { icon: BarChart3, text: 'Portefeuille avancé' },
      { icon: Shield, text: 'Auto-trading' },
    ],
  },
  ultra: {
    label: 'Ultra',
    price: '79,99€',
    features: [
      { icon: Zap, text: 'Questions illimitées' },
      { icon: Bot, text: 'Stratégies personnalisées' },
      { icon: BarChart3, text: 'Accès API' },
      { icon: Shield, text: 'Support prioritaire' },
    ],
  },
};

export default function UpgradePrompt({ requiredPlan, featureName }: UpgradePromptProps) {
  const plan = planFeatures[requiredPlan];

  return (
    <div className="glass-gold p-6 rounded-xl text-center max-w-md mx-auto" data-testid="upgrade-prompt">
      <div className="w-12 h-12 rounded-full bg-[var(--gold-muted)] flex items-center justify-center mx-auto mb-4">
        <Zap className="w-6 h-6 text-[var(--gold-primary)]" />
      </div>
      <h3
        className="text-lg font-semibold mb-1"
        style={{ fontFamily: 'var(--font-orbitron)' }}
      >
        Fonctionnalité {plan.label}
      </h3>
      {featureName && (
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          {featureName} est disponible avec le plan {plan.label} et supérieur.
        </p>
      )}
      <div className="space-y-2 mb-6 text-left">
        {plan.features.map((f) => (
          <div key={f.text} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <f.icon className="w-4 h-4 text-[var(--gold-primary)] shrink-0" />
            <span>{f.text}</span>
          </div>
        ))}
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--gold-primary)] text-[var(--bg-primary)] font-semibold text-sm hover:bg-[var(--gold-light)] transition-colors"
      >
        <Zap className="w-4 h-4" />
        Passer au {plan.label} — {plan.price}/mois
      </Link>
    </div>
  );
}
