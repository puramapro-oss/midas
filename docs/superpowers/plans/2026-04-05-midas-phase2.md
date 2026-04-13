# MIDAS Phase 2 — Partnership + i18n + Resilience + UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add partnership module, 16-language support, resilience infrastructure, and UX improvements to the existing MIDAS trading app.

**Architecture:** 4 independent workstreams that can be parallelized: resilience (lib layer), UX (hooks+components), partnership (full-stack), i18n (wrapping layer). Resilience must land first as partnership depends on circuit-breaker and fetch-retry.

**Tech Stack:** Next.js 16, Supabase, Stripe, next-intl, Upstash Redis, framer-motion

---

## Phase A: Resilience (lib layer)

### Task 1: Circuit Breaker

**Files:**
- Create: `src/lib/circuit-breaker.ts`

- [ ] **Step 1: Create circuit breaker**

```typescript
// src/lib/circuit-breaker.ts
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
  name: string;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 1,
  name: 'default',
};

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private options: CircuitBreakerOptions;

  constructor(opts: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...opts };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new Error(`Circuit breaker [${this.options.name}] is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitState { return this.state; }
  isOpen(): boolean { return this.state === 'open'; }
  reset() { this.state = 'closed'; this.failureCount = 0; }
}

// Singleton instances per service
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, opts?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker({ ...opts, name }));
  }
  return breakers.get(name)!;
}

export function getServiceStatus(): Record<string, { state: CircuitState; isHealthy: boolean }> {
  const status: Record<string, { state: CircuitState; isHealthy: boolean }> = {};
  for (const [name, breaker] of breakers) {
    status[name] = { state: breaker.getState(), isHealthy: !breaker.isOpen() };
  }
  return status;
}

export { CircuitBreaker };
export type { CircuitState, CircuitBreakerOptions };
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/circuit-breaker.ts
git commit -m "feat: add circuit breaker with singleton instances per service"
```

### Task 2: Fetch Retry Utility

**Files:**
- Create: `src/lib/fetch-retry.ts`

- [ ] **Step 1: Create fetch-retry**

```typescript
// src/lib/fetch-retry.ts
interface FetchRetryOptions {
  retries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  timeout: number;
  retryOn: number[];
}

const DEFAULTS: FetchRetryOptions = {
  retries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  timeout: 15000,
  retryOn: [408, 429, 500, 502, 503, 504],
};

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts?: Partial<FetchRetryOptions>
): Promise<Response> {
  const options = { ...DEFAULTS, ...opts };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok && options.retryOn.includes(response.status) && attempt < options.retries) {
        const delay = Math.min(
          options.initialDelay * Math.pow(options.backoffFactor, attempt),
          options.maxDelay
        );
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < options.retries) {
        const delay = Math.min(
          options.initialDelay * Math.pow(options.backoffFactor, attempt),
          options.maxDelay
        );
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error(`fetchWithRetry failed after ${options.retries + 1} attempts`);
}
```

- [ ] **Step 2: Commit**

### Task 3: Signal Cache for Binance Downtime

**Files:**
- Create: `src/lib/cache/signal-cache.ts`

- [ ] **Step 1: Create signal cache**

Uses Upstash Redis to cache last known signals. When Binance is unreachable, serve cached data with a "stale" flag.

```typescript
// src/lib/cache/signal-cache.ts
import { Redis } from '@upstash/redis';

const CACHE_TTL = 3600; // 1 hour
const CACHE_PREFIX = 'midas:signals:';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export interface CachedSignal {
  data: unknown;
  timestamp: number;
  isStale: boolean;
}

export async function cacheSignals(key: string, data: unknown): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(`${CACHE_PREFIX}${key}`, JSON.stringify({ data, timestamp: Date.now() }), { ex: CACHE_TTL });
  } catch { /* fail silently */ }
}

export async function getCachedSignals(key: string): Promise<CachedSignal | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const age = Date.now() - parsed.timestamp;
    return { data: parsed.data, timestamp: parsed.timestamp, isStale: age > 300000 }; // >5min = stale
  } catch { return null; }
}

export async function invalidateSignalCache(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try { await redis.del(`${CACHE_PREFIX}${key}`); } catch { /* */ }
}
```

- [ ] **Step 2: Commit**

### Task 4: Enhanced Health Check CRON

**Files:**
- Modify: `src/app/api/cron/health-check/route.ts`

- [ ] **Step 1: Rewrite health check to check all services**

The existing health check should verify: Binance API, Claude API, Stripe API, Supabase, Redis. Return detailed status per service.

- [ ] **Step 2: Commit**

---

## Phase B: UX Improvements

### Task 5: Skeleton Components

**Files:**
- Create: `src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Create versatile Skeleton component**

Shimmer animation skeleton with variants: text, card, chart, table, avatar, badge. Used throughout dashboard.

- [ ] **Step 2: Add skeletons to dashboard page**

Replace `loading` checks in PortfolioOverview, SignalsList, RecentActivity, AIStatusGauges, ShieldStatus with proper `<Skeleton>` shimmer states.

- [ ] **Step 3: Commit**

### Task 6: Double-Click Prevention Hook

**Files:**
- Create: `src/hooks/usePreventDoubleClick.ts`

- [ ] **Step 1: Create hook**

```typescript
// src/hooks/usePreventDoubleClick.ts
'use client';
import { useCallback, useRef } from 'react';

export function usePreventDoubleClick<T extends (...args: unknown[]) => Promise<unknown> | unknown>(
  fn: T,
  delayMs = 1000
): [(...args: Parameters<T>) => Promise<void>, boolean] {
  const lockRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);

  const wrapped = useCallback(async (...args: Parameters<T>) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setIsLocked(true);
    try {
      await fn(...args);
    } finally {
      setTimeout(() => {
        lockRef.current = false;
        setIsLocked(false);
      }, delayMs);
    }
  }, [fn, delayMs]);

  return [wrapped, isLocked];
}
```

- [ ] **Step 2: Commit**

### Task 7: Pull-to-Refresh Hook

**Files:**
- Create: `src/hooks/usePullToRefresh.ts`

- [ ] **Step 1: Create hook for mobile pull-to-refresh**

Touch-based pull detection with threshold, animation, and callback. iOS-native feel with spring physics.

- [ ] **Step 2: Integrate into DashboardShell.tsx for mobile**

- [ ] **Step 3: Commit**

### Task 8: Service Worker for Offline Trading Cache

**Files:**
- Create: `public/sw.js`
- Modify: `src/app/layout.tsx` (register SW)

- [ ] **Step 1: Create service worker**

Network First for API calls, Cache First for static assets. Cache trading data (signals, portfolio, market prices) for offline access.

- [ ] **Step 2: Register in layout.tsx**

- [ ] **Step 3: Commit**

---

## Phase C: Partnership Module

### Task 9: Database Schema for Partnership

**Files:**
- Create: `sql/partnership-tables.sql`

- [ ] **Step 1: Create SQL schema**

Tables: partners, partner_scans, partner_referrals, partner_commissions, partner_milestones, partner_payouts, partner_coach_messages. All with RLS policies.

- [ ] **Step 2: Execute SQL via SSH**

- [ ] **Step 3: Commit**

### Task 10: Partnership Types

**Files:**
- Create: `src/types/partnership.ts`

- [ ] **Step 1: Create TypeScript types for all partnership entities**

### Task 11: Partnership API Routes

**Files:**
- Create: `src/app/api/partner/register/route.ts`
- Create: `src/app/api/partner/scan/route.ts`
- Create: `src/app/api/partner/coach/route.ts`
- Create: `src/app/api/partner/qr/[code]/route.ts`
- Create: `src/app/api/partner/commissions/route.ts`
- Create: `src/app/api/partner/payouts/route.ts`
- Create: `src/app/api/partner/stats/route.ts`

- [ ] **Step 1-7: Create each API route**

### Task 12: Partnership Public Pages

**Files:**
- Create: `src/app/partenariat/page.tsx` (landing + simulator)
- Create: `src/app/partenariat/[canal]/page.tsx` (4 channel forms)
- Create: `src/app/scan/[code]/page.tsx` (QR/NFC scan)
- Create: `src/app/p/[slug]/page.tsx` (partner public profile)

### Task 13: Partnership Dashboard Pages

**Files:**
- Create: `src/app/dashboard/partenaire/page.tsx`
- Create: `src/app/dashboard/partenaire/filleuls/page.tsx`
- Create: `src/app/dashboard/partenaire/commissions/page.tsx`
- Create: `src/app/dashboard/partenaire/outils/page.tsx`
- Create: `src/app/dashboard/partenaire/coach/page.tsx`

### Task 14: Partnership Components

**Files:**
- Create: `src/components/partnership/PartnerDashboard.tsx`
- Create: `src/components/partnership/CommissionSimulator.tsx`
- Create: `src/components/partnership/QRGenerator.tsx`
- Create: `src/components/partnership/CoachChat.tsx`
- Create: `src/components/partnership/MilestoneTracker.tsx`
- Create: `src/components/partnership/PartnerCard.tsx`

### Task 15: Partnership Admin Pages

**Files:**
- Create: `src/app/admin/partenaires/page.tsx`
- Create: `src/app/admin/partenaires/[id]/page.tsx`

### Task 16: Partnership Anti-Fraud

**Files:**
- Create: `src/lib/partner/anti-fraud.ts`

Anti-fraud: 1 scan/IP/24h, max 100/day/QR, email verified, 14-day payout delay, self-referral detection, VPN detection.

### Task 17: Middleware Update for Partnership Routes

**Files:**
- Modify: `src/middleware.ts`

Add `/partenariat`, `/partenariat/*`, `/scan/*`, `/p/*` to public routes.

---

## Phase D: Multi-Langue (next-intl)

### Task 18: Install and Configure next-intl

**Files:**
- Modify: `package.json`
- Create: `src/i18n/request.ts`
- Create: `src/i18n/routing.ts`
- Create: `messages/fr.json`
- Create: `messages/en.json`
- Modify: `next.config.ts`

### Task 19: Create Translation Files

**Files:**
- Create: `messages/fr.json` (full French translations)
- Create: `messages/en.json` (full English translations)
- Create: `messages/es.json`, `de.json`, `it.json`, `pt.json`, `ar.json`, `zh.json`, `ja.json`, `ko.json`, `hi.json`, `ru.json`, `tr.json`, `nl.json`, `pl.json`, `sv.json`

### Task 20: Wrap Existing Components with Translations

Key components to wrap: Header, Sidebar, BottomNav, Footer, landing page sections, dashboard components, settings page (language selector with flags).

### Task 21: Language Selector in Settings

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx`

Add flag dropdown with 16 languages, save preference to profile metadata.

---

## Final

### Task 22: Build Verification

- [ ] Run `npm run build` — 0 errors
- [ ] Run `npx tsc --noEmit` — 0 errors
- [ ] Verify all new routes accessible
- [ ] Commit and deploy
