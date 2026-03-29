'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StepWelcome from '@/components/onboarding/StepWelcome';
import StepRiskProfile from '@/components/onboarding/StepRiskProfile';
import StepConnectExchange from '@/components/onboarding/StepConnectExchange';
import StepInterfaceMode from '@/components/onboarding/StepInterfaceMode';
import StepComplete from '@/components/onboarding/StepComplete';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

const TOTAL_STEPS = 5;

const stepLabels = [
  'Bienvenue',
  'Profil de risque',
  'Exchange',
  'Interface',
  'Terminé',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refetch } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [riskProfile, setRiskProfile] = useState<number | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [interfaceMode, setInterfaceMode] = useState<'simple' | 'expert'>('simple');
  const [loading, setLoading] = useState(false);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleRiskNext = useCallback((level: number) => {
    setRiskProfile(level);
    goNext();
  }, [goNext]);

  const handleExchangeNext = useCallback((exchange: string | null) => {
    setSelectedExchange(exchange);
    goNext();
  }, [goNext]);

  const handleInterfaceNext = useCallback((mode: 'simple' | 'expert') => {
    setInterfaceMode(mode);
    goNext();
  }, [goNext]);

  const handleSkip = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleFinish = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          risk_level: riskProfile ?? 1,
          preferred_exchange: selectedExchange,
          interface_mode: interfaceMode,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refetch();
      router.push('/dashboard');
    } catch {
      // Silently fail - user can still use the app
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [user, riskProfile, selectedExchange, interfaceMode, refetch, router]);

  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-[#06080F] flex flex-col" data-testid="onboarding-page">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#FFD700]/[0.02] blur-[150px]" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-4 pt-6 pb-2 max-w-2xl mx-auto w-full" data-testid="onboarding-progress">
        {/* Step labels */}
        <div className="flex items-center justify-between mb-3 px-1">
          {stepLabels.map((label, i) => (
            <span
              key={label}
              className={`text-[10px] sm:text-xs font-medium transition-colors duration-300 ${
                i <= currentStep ? 'text-[#FFD700]' : 'text-white/25'
              }`}
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </span>
          ))}
        </div>

        {/* Bar */}
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#DAA520]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Step counter */}
        <p className="text-xs text-white/30 mt-2 text-right">
          {currentStep + 1} / {TOTAL_STEPS}
        </p>
      </div>

      {/* Step content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              {currentStep === 0 && (
                <StepWelcome onNext={goNext} />
              )}
              {currentStep === 1 && (
                <StepRiskProfile
                  initialValue={riskProfile ?? 1}
                  onNext={handleRiskNext}
                  onSkip={handleSkip}
                />
              )}
              {currentStep === 2 && (
                <StepConnectExchange
                  onNext={handleExchangeNext}
                  onSkip={handleSkip}
                />
              )}
              {currentStep === 3 && (
                <StepInterfaceMode
                  initialValue={interfaceMode}
                  onNext={handleInterfaceNext}
                  onSkip={handleSkip}
                />
              )}
              {currentStep === 4 && (
                <StepComplete
                  data={{
                    riskLevel: riskProfile,
                    exchange: selectedExchange,
                    interfaceMode,
                  }}
                  onFinish={handleFinish}
                  loading={loading}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Back button (steps 1-3 only) */}
      {currentStep > 0 && currentStep < 4 && (
        <div className="relative z-10 px-4 pb-6 max-w-2xl mx-auto w-full">
          <button
            onClick={goPrev}
            className="text-sm text-white/40 hover:text-white/70 transition-colors duration-200 flex items-center gap-1.5"
            data-testid="onboarding-back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
        </div>
      )}
    </div>
  );
}
