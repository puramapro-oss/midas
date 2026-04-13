// =============================================================================
// MIDAS — Health Check CRON
// Verifie tous les services: Binance, Claude, Stripe, Supabase, Redis
// Utilise les circuit breakers pour chaque verification
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCircuitBreaker, getServiceStatus } from '@/lib/circuit-breaker';
import { redis } from '@/lib/cache/upstash';

type ServiceStatus = 'up' | 'down' | 'degraded';

interface ServiceCheck {
  status: ServiceStatus;
  latencyMs: number;
  error?: string;
}

interface HealthCheckResponse {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceCheck>;
  circuitBreakers: Record<string, { state: string; failureCount: number }>;
  timestamp: string;
}

const BINANCE_PING_URL = 'https://api.binance.com/api/v3/ping';
const STRIPE_BALANCE_URL = 'https://api.stripe.com/v1/balance';
const SERVICE_TIMEOUT_MS = 10_000;

/**
 * Verifie un service via son circuit breaker. Retourne le resultat.
 */
async function checkService(
  name: string,
  fn: () => Promise<void>
): Promise<ServiceCheck> {
  const breaker = getCircuitBreaker(name, {
    failureThreshold: 3,
    resetTimeoutMs: 60_000,
  });
  const start = Date.now();

  try {
    await breaker.execute(fn);
    return {
      status: 'up',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: message,
    };
  }
}

/**
 * Binance: ping l'API publique
 */
async function checkBinance(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERVICE_TIMEOUT_MS);
  try {
    const response = await fetch(BINANCE_PING_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Binance HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Claude/Anthropic: verifie que la cle API est configuree
 */
async function checkClaude(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    throw new Error('ANTHROPIC_API_KEY manquante ou invalide');
  }
  // La cle existe et a une longueur raisonnable
}

/**
 * Stripe: verifie en appelant l'endpoint balance
 */
async function checkStripe(): Promise<void> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY manquante');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERVICE_TIMEOUT_MS);
  try {
    const response = await fetch(STRIPE_BALANCE_URL, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Stripe HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Supabase: execute SELECT 1 via le service role client
 */
async function checkSupabase(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase credentials manquantes');
  }

  const supabase = createClient(url, key, {
    db: { schema: 'public' },
    auth: { persistSession: false },
  });

  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    throw new Error(`Supabase: ${error.message}`);
  }
}

/**
 * Redis/Upstash: ping
 */
async function checkRedis(): Promise<void> {
  const result = await redis.ping();
  if (result !== 'PONG') {
    throw new Error(`Redis ping retourne: ${String(result)}`);
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
  }

  try {
    const [binance, claude, stripe, supabase, redisCheck] = await Promise.all([
      checkService('binance', checkBinance),
      checkService('claude', checkClaude),
      checkService('stripe', checkStripe),
      checkService('supabase', checkSupabase),
      checkService('redis', checkRedis),
    ]);

    const services: Record<string, ServiceCheck> = {
      binance,
      claude,
      stripe,
      supabase,
      redis: redisCheck,
    };

    const allStatuses = Object.values(services).map((s) => s.status);
    const allUp = allStatuses.every((s) => s === 'up');
    const allDown = allStatuses.every((s) => s === 'down');

    let overallStatus: HealthCheckResponse['status'];
    if (allUp) {
      overallStatus = 'healthy';
    } else if (allDown) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    // Extraire un resume des circuit breakers
    const breakerStatuses = getServiceStatus();
    const circuitBreakers: Record<string, { state: string; failureCount: number }> = {};
    for (const [name, status] of Object.entries(breakerStatuses)) {
      circuitBreakers[name] = {
        state: status.state,
        failureCount: status.failureCount,
      };
    }

    const response: HealthCheckResponse = {
      success: true,
      status: overallStatus,
      services,
      circuitBreakers,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: overallStatus === 'unhealthy' ? 503 : 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
