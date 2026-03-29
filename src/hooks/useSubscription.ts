'use client';

import { useMemo } from 'react';
import { PLAN_LIMITS } from '@/types/database';
import type { Plan, Profile } from '@/types/database';

interface UseSubscriptionReturn {
  plan: Plan;
  isProOrAbove: boolean;
  isUltra: boolean;
  canDoAction: (feature: string) => boolean;
  daysUntilExpiry: number | null;
  dailyQuestionsRemaining: number;
  maxTokens: number;
}

const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 0,
  pro: 1,
  ultra: 2,
};

export function useSubscription(profile: Profile | null): UseSubscriptionReturn {
  const plan: Plan = profile?.plan ?? 'free';

  const isProOrAbove = useMemo(
    () => PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY.pro,
    [plan]
  );

  const isUltra = plan === 'ultra';

  const canDoAction = useMemo(
    () => (feature: string) => {
      const limits = PLAN_LIMITS[plan];
      return limits.features.includes(feature);
    },
    [plan]
  );

  const daysUntilExpiry = useMemo(() => {
    if (!profile?.subscription_status || profile.subscription_status !== 'active') {
      return null;
    }
    if (!profile.billing_period) {
      return null;
    }

    const createdAt = new Date(profile.updated_at);
    const periodDays = profile.billing_period === 'yearly' ? 365 : 30;
    const expiryDate = new Date(createdAt.getTime() + periodDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }, [profile]);

  const dailyQuestionsRemaining = useMemo(() => {
    if (!profile) return PLAN_LIMITS.free.daily_questions;
    return Math.max(0, profile.daily_questions_limit - profile.daily_questions_used);
  }, [profile]);

  const maxTokens = PLAN_LIMITS[plan].max_tokens;

  return {
    plan,
    isProOrAbove,
    isUltra,
    canDoAction,
    daysUntilExpiry,
    dailyQuestionsRemaining,
    maxTokens,
  };
}
