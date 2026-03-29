// =============================================================================
// MIDAS — Plan Limits
// Fonctions de verification des limites et features par plan
// =============================================================================

import type { MidasPlan, PlanLimits } from '@/types/stripe';
import type { Profile } from '@/types/database';
import { PLAN_LIMITS } from '@/lib/utils/constants';

// --- Feature Check ---

export type PlanFeatureKey = keyof PlanLimits;

/**
 * Verifie si une feature est disponible pour un plan donne
 */
export function canUseFeature(plan: MidasPlan, feature: PlanFeatureKey): boolean {
  const limits = PLAN_LIMITS[plan]?.limits;
  if (!limits) return false;

  const value = limits[feature];

  // Boolean features
  if (typeof value === 'boolean') {
    return value;
  }

  // Numeric features : 0 = non disponible, >0 = disponible
  if (typeof value === 'number') {
    return value > 0;
  }

  return false;
}

/**
 * Retourne les limites completes d'un plan
 */
export function getPlanLimits(plan: MidasPlan): PlanLimits {
  return PLAN_LIMITS[plan].limits;
}

// --- Questions ---

/**
 * Retourne le nombre de questions IA restantes aujourd'hui
 */
export function getRemainingQuestions(profile: Profile): number {
  const limit = PLAN_LIMITS[profile.plan]?.limits.daily_questions ?? 0;
  const used = profile.daily_questions_used;
  return Math.max(0, limit - used);
}

/**
 * Verifie si l'utilisateur peut poser une question IA
 */
export function canAskQuestion(profile: Profile): boolean {
  // Super admin bypass
  if (profile.role === 'super_admin') return true;

  // Verifier si le reset est necessaire
  if (shouldResetDaily(profile.daily_questions_reset_at)) {
    return true;
  }

  return getRemainingQuestions(profile) > 0;
}

// --- Trades ---

/**
 * Retourne le nombre de trades restants aujourd'hui
 */
export function getRemainingTrades(profile: Profile): number {
  const limit = PLAN_LIMITS[profile.plan]?.limits.daily_trades ?? 0;
  const used = profile.daily_trades_used;
  return Math.max(0, limit - used);
}

/**
 * Verifie si l'utilisateur peut executer un trade
 */
export function canExecuteTrade(profile: Profile): boolean {
  // Super admin bypass
  if (profile.role === 'super_admin') return true;

  // Verifier si le reset est necessaire
  if (shouldResetDaily(profile.daily_trades_reset_at)) {
    return true;
  }

  return getRemainingTrades(profile) > 0;
}

// --- Exchanges ---

/**
 * Retourne le nombre maximum d'exchanges connectables
 */
export function getMaxExchanges(plan: MidasPlan): number {
  return PLAN_LIMITS[plan]?.limits.max_exchanges ?? 1;
}

/**
 * Verifie si l'utilisateur peut connecter un exchange supplementaire
 */
export function canConnectExchange(plan: MidasPlan, currentCount: number): boolean {
  return currentCount < getMaxExchanges(plan);
}

// --- Bots ---

/**
 * Retourne le nombre maximum de bots actifs
 */
export function getMaxBots(plan: MidasPlan): number {
  return PLAN_LIMITS[plan]?.limits.max_bots ?? 1;
}

/**
 * Verifie si l'utilisateur peut creer un bot supplementaire
 */
export function canCreateBot(plan: MidasPlan, currentActiveBots: number): boolean {
  return currentActiveBots < getMaxBots(plan);
}

// --- Positions ---

/**
 * Retourne le nombre maximum de positions simultanées
 */
export function getMaxPositions(plan: MidasPlan): number {
  return PLAN_LIMITS[plan]?.limits.max_positions ?? 3;
}

/**
 * Verifie si l'utilisateur peut ouvrir une position supplementaire
 */
export function canOpenPosition(plan: MidasPlan, currentPositions: number): boolean {
  return currentPositions < getMaxPositions(plan);
}

// --- Usage Summary ---

export interface UsageSummary {
  plan: MidasPlan;
  questions: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  trades: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  features: {
    backtesting: boolean;
    paper_trading: boolean;
    advanced_agents: boolean;
    smart_money_analysis: boolean;
    order_flow: boolean;
    derivatives_analysis: boolean;
    manipulation_detection: boolean;
    api_access: boolean;
  };
}

/**
 * Retourne un resume complet de l'usage et des limites du profil
 */
export function getUsageSummary(profile: Profile): UsageSummary {
  const limits = PLAN_LIMITS[profile.plan].limits;
  const remainingQ = getRemainingQuestions(profile);
  const remainingT = getRemainingTrades(profile);

  return {
    plan: profile.plan,
    questions: {
      used: profile.daily_questions_used,
      limit: limits.daily_questions,
      remaining: remainingQ,
      percentage: limits.daily_questions > 0
        ? Math.round((profile.daily_questions_used / limits.daily_questions) * 100)
        : 0,
    },
    trades: {
      used: profile.daily_trades_used,
      limit: limits.daily_trades,
      remaining: remainingT,
      percentage: limits.daily_trades > 0
        ? Math.round((profile.daily_trades_used / limits.daily_trades) * 100)
        : 0,
    },
    features: {
      backtesting: limits.backtesting,
      paper_trading: limits.paper_trading,
      advanced_agents: limits.advanced_agents,
      smart_money_analysis: limits.smart_money_analysis,
      order_flow: limits.order_flow,
      derivatives_analysis: limits.derivatives_analysis,
      manipulation_detection: limits.manipulation_detection,
      api_access: limits.api_access,
    },
  };
}

// --- Helpers ---

/**
 * Verifie si le compteur quotidien devrait etre reinitialise
 */
function shouldResetDaily(resetAt: string | null): boolean {
  if (!resetAt) return true;
  const resetDate = new Date(resetAt);
  const now = new Date();
  return now >= resetDate;
}

/**
 * Retourne le plan superieur, ou null si deja au max
 */
export function getUpgradePlan(currentPlan: MidasPlan): MidasPlan | null {
  const hierarchy: MidasPlan[] = ['free', 'pro', 'ultra'];
  const currentIndex = hierarchy.indexOf(currentPlan);
  if (currentIndex >= hierarchy.length - 1) return null;
  return hierarchy[currentIndex + 1];
}
