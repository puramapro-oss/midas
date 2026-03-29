// =============================================================================
// MIDAS — Idempotency Guard
// Prevent duplicate trade execution using Redis with 5-minute buckets
// =============================================================================

import { redis } from '@/lib/cache/upstash';

const IDEMPOTENCY_TTL_SECONDS = 300; // 5 minutes
const KEY_PREFIX = 'midas:idempotency:';

/**
 * Check if a trade has already been submitted recently.
 * Returns true if a duplicate is detected (trade should be BLOCKED).
 * Returns false if no duplicate (trade can proceed).
 *
 * On first call, sets the key so subsequent calls within 5 min are blocked.
 */
export async function checkIdempotency(
  userId: string,
  pair: string,
  side: 'buy' | 'sell'
): Promise<boolean> {
  const bucket = Math.floor(Date.now() / (IDEMPOTENCY_TTL_SECONDS * 1000));
  const key = `${KEY_PREFIX}${userId}:${pair}:${side}:${bucket}`;

  // INCR returns 1 on first call (key created), > 1 if already exists
  const count = await redis.incr(key);

  if (count === 1) {
    // First time — set expiry and allow
    await redis.expire(key, IDEMPOTENCY_TTL_SECONDS);
    return false; // No duplicate
  }

  // Duplicate detected
  return true;
}

/**
 * Generate a unique idempotency key for an order.
 * Used for exchange-level dedup (e.g., ccxt order placement).
 */
export function generateIdempotencyKey(
  userId: string,
  pair: string,
  side: 'buy' | 'sell',
  timestamp: number
): string {
  const bucket = Math.floor(timestamp / (IDEMPOTENCY_TTL_SECONDS * 1000));
  return `${userId}-${pair}-${side}-${bucket}`;
}

/**
 * Clear idempotency lock for a specific trade combination.
 * Useful after a failed trade that should be retried.
 */
export async function clearIdempotency(
  userId: string,
  pair: string,
  side: 'buy' | 'sell'
): Promise<void> {
  const bucket = Math.floor(Date.now() / (IDEMPOTENCY_TTL_SECONDS * 1000));
  const key = `${KEY_PREFIX}${userId}:${pair}:${side}:${bucket}`;
  await redis.del(key);
}
