'use client';

import type { ReactNode } from 'react';
import type { Plan } from '@/types/database';
import UpgradePrompt from './UpgradePrompt';

interface PlanGateProps {
  children: ReactNode;
  requiredPlan: 'pro' | 'ultra';
  currentPlan: Plan | null;
  featureName?: string;
}

const planHierarchy: Record<Plan, number> = {
  free: 0,
  pro: 1,
  ultra: 2,
};

export default function PlanGate({ children, requiredPlan, currentPlan, featureName }: PlanGateProps) {
  const currentLevel = planHierarchy[currentPlan ?? 'free'];
  const requiredLevel = planHierarchy[requiredPlan];

  if (currentLevel >= requiredLevel) {
    return <>{children}</>;
  }

  return <UpgradePrompt requiredPlan={requiredPlan} featureName={featureName} />;
}
