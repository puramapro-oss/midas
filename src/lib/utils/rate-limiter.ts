// =============================================================================
// MIDAS — Rate Limiter
// Rate limiting par plan et par route utilisant Upstash Ratelimit
// =============================================================================

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { MidasPlan } from '@/types/stripe';

// --- Redis Client ---

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) throw new Error('Rate limit storage is not configured');
  return new Redis({
    url,
    token,
  });
}

// --- Rate Limit Configs par plan ---

interface RateLimitConfig {
  requests: number;
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`;
}

const PLAN_RATE_LIMITS: Record<MidasPlan, RateLimitConfig> = {
  free: { requests: 30, window: '1 m' },
  pro: { requests: 120, window: '1 m' },
  ultra: { requests: 600, window: '1 m' },
};

// --- Rate Limits par route ---

interface RouteLimitConfig {
  prefix: string;
  free: RateLimitConfig;
  pro: RateLimitConfig;
  ultra: RateLimitConfig;
}

const ROUTE_LIMITS: Record<string, RouteLimitConfig> = {
  '/api/ai/chat': {
    prefix: 'midas:rl:ai:chat',
    free: { requests: 15, window: '1 d' },
    pro: { requests: 200, window: '1 d' },
    ultra: { requests: 10000, window: '1 d' },
  },
  '/api/trade/execute': {
    prefix: 'midas:rl:trade:execute',
    free: { requests: 5, window: '1 d' },
    pro: { requests: 50, window: '1 d' },
    ultra: { requests: 10000, window: '1 d' },
  },
  '/api/exchange/sync': {
    prefix: 'midas:rl:exchange:sync',
    free: { requests: 10, window: '1 m' },
    pro: { requests: 30, window: '1 m' },
    ultra: { requests: 120, window: '1 m' },
  },
  '/api/backtest': {
    prefix: 'midas:rl:backtest',
    free: { requests: 0, window: '1 d' },
    pro: { requests: 10, window: '1 d' },
    ultra: { requests: 100, window: '1 d' },
  },
  '/api/v1': {
    prefix: 'midas:rl:api:v1',
    free: { requests: 0, window: '1 m' },
    pro: { requests: 0, window: '1 m' },
    ultra: { requests: 300, window: '1 m' },
  },
};

// --- Instances Ratelimit cache ---

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(prefix: string, config: RateLimitConfig): Ratelimit {
  const key = `${prefix}:${config.requests}:${config.window}`;
  const cached = limiterCache.get(key);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix,
    analytics: true,
  });

  limiterCache.set(key, limiter);
  return limiter;
}

// --- Public API ---

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

function unavailableRateLimit(limit: number): RateLimitResult {
  // A short retry delay is not a claim that the user's quota was reset.
  // Never include provider errors, URLs or credentials in this log.
  console.error('[rate-limit] Stockage indisponible, requête refusée temporairement');
  return { allowed: false, limit, remaining: 0, reset: Date.now() + 5_000 };
}

/**
 * Verifie le rate limit global pour un utilisateur selon son plan
 */
export async function checkRateLimit(
  userId: string,
  plan: MidasPlan
): Promise<RateLimitResult> {
  if (!Object.hasOwn(PLAN_RATE_LIMITS, plan)) return unavailableRateLimit(0);
  const config = PLAN_RATE_LIMITS[plan];
  let result;
  try {
    const limiter = getLimiter(`midas:rl:global:${plan}`, config);
    result = await limiter.limit(userId);
  } catch {
    return unavailableRateLimit(config.requests);
  }
  // The SDK deliberately returns success:true on timeout. No quota admission
  // was confirmed, so that fallback must not authorize a paid or write action.
  if (result.reason === 'timeout') return unavailableRateLimit(config.requests);

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Verifie le rate limit pour une route specifique selon le plan
 */
export async function checkRouteRateLimit(
  userId: string,
  route: string,
  plan: MidasPlan
): Promise<RateLimitResult> {
  const routeConfig = Object.hasOwn(ROUTE_LIMITS, route) ? ROUTE_LIMITS[route] : undefined;

  // Pas de config specifique pour cette route => utiliser le global
  if (!routeConfig) {
    return checkRateLimit(userId, plan);
  }

  if (!Object.hasOwn(PLAN_RATE_LIMITS, plan)) return unavailableRateLimit(0);
  const planConfig = routeConfig[plan];

  // 0 requests = fonctionnalite non disponible pour ce plan
  if (planConfig.requests === 0) {
    return {
      allowed: false,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }

  let result;
  try {
    const limiter = getLimiter(routeConfig.prefix, planConfig);
    result = await limiter.limit(userId);
  } catch {
    return unavailableRateLimit(planConfig.requests);
  }
  if (result.reason === 'timeout') return unavailableRateLimit(planConfig.requests);

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Retourne les headers HTTP de rate limit
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const retryAfter = Number.isFinite(result.reset)
    ? Math.max(0, Math.ceil((result.reset - Date.now()) / 1000))
    : 0;
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
    ...(result.allowed ? {} : { 'Retry-After': String(retryAfter) }),
  };
}
