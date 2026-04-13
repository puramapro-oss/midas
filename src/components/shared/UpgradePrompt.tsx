'use client';

import { useState } from 'react';
import { Zap, TrendingUp, Bot, BarChart3, Shield, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface UpgradePromptProps {
  requiredPlan: 'pro' | 'ultra';
  featureName?: string;
}

const planFeatures: Record<string, { label: string; price: string; features: { icon: typeof Zap; text: string }[] }> = {
  pro: {
    label: 'Pro',
    price: '39€',
    features: [
      { icon: TrendingUp, text: 'Chat IA illimite' },
      { icon: Bot, text: 'Backtesting & signaux' },
      { icon: BarChart3, text: '2 trades auto / jour' },
      { icon: Shield, text: 'MIDAS SHIELD complet' },
    ],
  },
  ultra: {
    label: 'Ultra',
    price: '79€',
    features: [
      { icon: Zap, text: 'Trades illimites' },
      { icon: Bot, text: 'Strategies personnalisees' },
      { icon: BarChart3, text: 'Acces API' },
      { icon: Shield, text: 'Support prioritaire 24/7' },
    ],
  },
};

export default function UpgradePrompt({ requiredPlan, featureName }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);
  const { isSuperAdmin, plan: userPlan } = useAuth();
  const planInfo = planFeatures[requiredPlan];
  const isMaxPlan = isSuperAdmin || userPlan === 'ultra';

  const handleCheckout = async () => {
    if (isMaxPlan) return;
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: requiredPlan, period: 'monthly' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // fallback silently
    } finally {
      setLoading(false);
    }
  };

  if (isMaxPlan) {
    return (
      <div className="glass-gold p-6 rounded-xl text-center max-w-md mx-auto" data-testid="upgrade-prompt">
        <div className="w-12 h-12 rounded-full bg-[var(--gold-muted)] flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-6 h-6 text-[var(--gold-primary)]" />
        </div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ fontFamily: 'var(--font-orbitron)' }}
        >
          Plan maximum actif
        </h3>
        <p className="text-[var(--text-secondary)] text-sm">
          Tu es deja sur le plan maximum. Toutes les fonctionnalites sont deverrouillees.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-gold p-6 rounded-xl text-center max-w-md mx-auto" data-testid="upgrade-prompt">
      <div className="w-12 h-12 rounded-full bg-[var(--gold-muted)] flex items-center justify-center mx-auto mb-4">
        <Zap className="w-6 h-6 text-[var(--gold-primary)]" />
      </div>
      <h3
        className="text-lg font-semibold mb-1"
        style={{ fontFamily: 'var(--font-orbitron)' }}
      >
        Fonctionnalite {planInfo.label}
      </h3>
      {featureName && (
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          {featureName} est disponible avec le plan {planInfo.label} et superieur.
        </p>
      )}
      <div className="space-y-2 mb-6 text-left">
        {planInfo.features.map((f) => (
          <div key={f.text} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <f.icon className="w-4 h-4 text-[var(--gold-primary)] shrink-0" />
            <span>{f.text}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={handleCheckout}
        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--gold-primary)] text-[var(--bg-primary)] font-semibold text-sm hover:bg-[var(--gold-light)] transition-colors disabled:opacity-50"
        data-testid="upgrade-button"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        {loading ? 'Redirection...' : `Passer au ${planInfo.label} — ${planInfo.price}/mois`}
      </button>
    </div>
  );
}
