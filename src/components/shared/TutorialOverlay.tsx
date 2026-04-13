'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, SkipForward } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TutorialStep {
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetSelector: '[data-testid="dashboard-ai-gauges"]',
    title: 'Voici ton Dashboard',
    description:
      'Ici tu vois les scores IA en temps réel : Global, Technique, Sentiment et On-Chain. Ces 6 agents analysent le marché pour toi, 24h/24.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-testid="dashboard-signals"]',
    title: 'Tes Signaux IA',
    description:
      'Les signaux te disent quand acheter ou vendre. Chaque signal inclut le niveau de confiance, le Stop-Loss et le Take-Profit. Tu n\'as qu\'à suivre.',
    position: 'top',
  },
  {
    targetSelector: '[data-testid="bottomnav-trading"], [data-testid="sidebar-trading"]',
    title: 'Trading',
    description:
      'L\'onglet Trading te donne accès aux stratégies automatiques et manuelles. Tu peux lancer des bots ou passer des ordres toi-même.',
    position: 'top',
  },
  {
    targetSelector: '[data-testid="dashboard-portfolio"], [data-testid="sidebar-portfolio"]',
    title: 'Portfolio',
    description:
      'Suis l\'évolution de ton portefeuille en temps réel. Tu vois ta performance, tes positions ouvertes et ton historique.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-testid="bottomnav-chat"], [data-testid="sidebar-chat"]',
    title: 'Chat IA',
    description:
      'Pose n\'importe quelle question à l\'IA. Elle est spécialisée en trading et crypto. Elle peut analyser des paires, t\'expliquer des stratégies ou t\'aider à prendre des décisions.',
    position: 'top',
  },
  {
    targetSelector: '[data-testid="dashboard-shield"]',
    title: 'MIDAS Shield',
    description:
      'Le Shield protège ton capital avec 7 niveaux de sécurité : stop-loss, limites de pertes, détection d\'anomalies... Il veille sur toi en permanence.',
    position: 'top',
  },
  {
    targetSelector: '[data-testid="bottomnav-parrainage"], [data-testid="sidebar-referral"]',
    title: 'Parrainage',
    description:
      'Invite tes amis et gagne des commissions. Ton filleul a -50% sur son 1er mois, et toi tu touches 50% de son 1er paiement + 10% à vie.',
    position: 'top',
  },
  {
    targetSelector: '[data-testid="sidebar-settings"], [data-testid="bottomnav-dashboard"]',
    title: 'Réglages',
    description:
      'Dans les réglages, tu peux modifier ton profil de risque, connecter tes clés API Binance, changer de thème et gérer tes notifications.',
    position: 'top',
  },
];

interface TutorialOverlayProps {
  userId: string;
  onComplete: () => void;
}

export default function TutorialOverlay({ userId, onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = TUTORIAL_STEPS[currentStep];

  const findTarget = useCallback(() => {
    if (!step) return null;
    const selectors = step.targetSelector.split(', ');
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }, [step]);

  useEffect(() => {
    const updateRect = () => {
      const target = findTarget();
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    const timer = setTimeout(updateRect, 300);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [currentStep, findTarget]);

  const completeTutorial = useCallback(async () => {
    setVisible(false);
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ tutorial_completed: true })
      .eq('id', userId);
    onComplete();
  }, [userId, onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      void completeTutorial();
    }
  }, [currentStep, completeTutorial]);

  const handleSkip = useCallback(() => {
    void completeTutorial();
  }, [completeTutorial]);

  if (!visible) return null;

  const padding = 12;
  const spotlightStyle = targetRect
    ? {
        top: targetRect.top - padding,
        left: targetRect.left - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }
    : null;

  const getBubblePosition = (): React.CSSProperties => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const pos = step.position;
    const margin = 16;

    if (pos === 'bottom') {
      return {
        top: targetRect.bottom + padding + margin,
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 340)),
      };
    }
    if (pos === 'top') {
      return {
        bottom: window.innerHeight - targetRect.top + padding + margin,
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 340)),
      };
    }
    if (pos === 'right') {
      return {
        top: targetRect.top,
        left: targetRect.right + padding + margin,
      };
    }
    return {
      top: targetRect.top,
      right: window.innerWidth - targetRect.left + padding + margin,
    };
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[9000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="tutorial-overlay"
        >
          {/* Dark overlay with spotlight cutout */}
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            <defs>
              <mask id="tutorial-spotlight">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {spotlightStyle && (
                  <rect
                    x={spotlightStyle.left}
                    y={spotlightStyle.top}
                    width={spotlightStyle.width}
                    height={spotlightStyle.height}
                    rx="16"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.75)"
              mask="url(#tutorial-spotlight)"
              style={{ pointerEvents: 'auto' }}
              onClick={handleNext}
            />
          </svg>

          {/* Spotlight border glow */}
          {spotlightStyle && (
            <div
              className="absolute rounded-2xl border-2 border-[var(--gold-primary)] shadow-[0_0_20px_rgba(255,215,0,0.3)] pointer-events-none"
              style={spotlightStyle}
            />
          )}

          {/* Tooltip bubble */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute z-[9001] w-[320px] max-w-[calc(100vw-32px)]"
            style={getBubblePosition()}
            data-testid="tutorial-bubble"
          >
            <div className="glass rounded-2xl p-5 border border-[var(--gold-primary)]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              {/* Step counter */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--gold-primary)]">
                    {currentStep + 1}/{TUTORIAL_STEPS.length}
                  </span>
                  <div className="flex gap-1">
                    {TUTORIAL_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          i <= currentStep
                            ? 'w-4 bg-[var(--gold-primary)]'
                            : 'w-1.5 bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  aria-label="Fermer le tutoriel"
                  data-testid="tutorial-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                {step.description}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
                  data-testid="tutorial-skip"
                >
                  <SkipForward className="w-3 h-3" />
                  Passer le tuto
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--gold-primary)] text-black text-sm font-semibold hover:bg-[var(--gold-secondary)] transition-colors"
                  data-testid="tutorial-next"
                >
                  {currentStep < TUTORIAL_STEPS.length - 1 ? (
                    <>
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    "C'est parti !"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
